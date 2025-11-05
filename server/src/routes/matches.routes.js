const express = require('express');
const Match = require('../models/Match');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

// 매칭 목록 조회
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 내가 포함된 모든 매칭 조회
    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).sort({ createdAt: -1 });
    
    // 각 매칭의 상대방 정보 및 메시지 정보 가져오기
    const result = await Promise.all(matches.map(async (match) => {
      // 상대방 ID 찾기
      const matchedUserId = match.user1.equals(userId) 
        ? match.user2 
        : match.user1;
      
      // 상대방 정보 조회
      const matchedUser = await User.findById(matchedUserId)
        .select('nickname profileImage age college aiScore');
      
      // 마지막 메시지 조회
      const lastMessage = await Message.findOne({ matchId: match._id })
        .sort({ createdAt: -1 });
      
      // 안읽은 메시지 수
      const unreadCount = await Message.countDocuments({
        matchId: match._id,
        receiver: userId,
        isRead: false
      });
      
      return {
        matchId: match._id,
        matchedUser,
        lastMessage: lastMessage ? {
          text: lastMessage.text,
          timestamp: lastMessage.createdAt
        } : null,
        unreadCount,
        createdAt: match.createdAt
      };
    }));
    
    res.json({ success: true, matches: result });
  } catch (error) {
    next(error);
  }
});

// 매칭 취소 (삭제)
router.delete('/:matchId', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const matchId = req.params.matchId;

    console.log(`🗑️  [DEBUG] 매칭 취소 요청 - 사용자: ${userId}, Match ID: ${matchId}`);

    // 매칭 검증 (내가 속한 매칭인지)
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }]
    });

    if (!match) {
      return res.status(404).json({ error: '매칭을 찾을 수 없거나 권한이 없습니다' });
    }

    // 상대방 ID 찾기
    const otherUserId = match.user1.equals(userId) ? match.user2 : match.user1;

    console.log(`🗑️  [DEBUG] 상대방 ID: ${otherUserId}`);

    // 1. 해당 매칭의 모든 메시지 삭제
    const messagesDeleted = await Message.deleteMany({ matchId: matchId });
    console.log(`🗑️  [DEBUG] 삭제된 메시지 수: ${messagesDeleted.deletedCount}`);

    // 2. 매칭 문서 삭제
    await Match.findByIdAndDelete(matchId);
    console.log(`🗑️  [DEBUG] 매칭 삭제 완료`);

    // 3. (선택사항) User 모델의 likedUsers, likedByUsers에서 상대방 ID 제거
    // 이렇게 하면 서로 다시 좋아요를 눌러야 매칭이 다시 성립됨
    const currentUser = await User.findById(userId);
    const otherUser = await User.findById(otherUserId);

    if (currentUser && otherUser) {
      // 좋아요 배열에서 상대방 제거
      currentUser.likedUsers = currentUser.likedUsers.filter(
        id => !id.equals(otherUserId)
      );
      otherUser.likedByUsers = otherUser.likedByUsers.filter(
        id => !id.equals(userId)
      );

      otherUser.likedUsers = otherUser.likedUsers.filter(
        id => !id.equals(userId)
      );
      currentUser.likedByUsers = currentUser.likedByUsers.filter(
        id => !id.equals(otherUserId)
      );

      await currentUser.save();
      await otherUser.save();

      console.log(`🗑️  [DEBUG] 좋아요 배열에서 상호 제거 완료`);
    }

    res.json({
      success: true,
      message: '매칭이 취소되었습니다'
    });
  } catch (error) {
    console.error('❌ [ERROR] 매칭 취소 실패:', error);
    next(error);
  }
});

module.exports = router;
