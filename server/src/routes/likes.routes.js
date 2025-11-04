const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const { createMatch, checkMutualLike } = require('../services/match.service');
const router = express.Router();

// 좋아요 추가
router.post('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;
    
    // 본인에게 좋아요 방지
    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: '본인에게 좋아요할 수 없습니다' });
    }
    
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    
    // 이미 좋아요 했는지 체크
    if (currentUser.likedUsers.includes(targetUserId)) {
      return res.status(400).json({ error: '이미 좋아요한 사용자입니다' });
    }
    
    // 좋아요 추가
    currentUser.likedUsers.push(targetUserId);
    targetUser.likedByUsers.push(currentUserId);
    
    await currentUser.save();
    await targetUser.save();
    
    // 상호 좋아요 체크
    const isMatched = await checkMutualLike(currentUserId, targetUserId);
    
    let matchId = null;
    if (isMatched) {
      const match = await createMatch(currentUserId, targetUserId);
      matchId = match._id;
    }
    
    res.json({
      success: true,
      message: '좋아요 완료',
      isMatched,
      matchId
    });
  } catch (error) {
    next(error);
  }
});

// 좋아요 취소
router.delete('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 좋아요 제거
    currentUser.likedUsers = currentUser.likedUsers.filter(
      id => !id.equals(targetUserId)
    );
    targetUser.likedByUsers = targetUser.likedByUsers.filter(
      id => !id.equals(currentUserId)
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ success: true, message: '좋아요 취소 완료' });
  } catch (error) {
    next(error);
  }
});

// 나를 좋아요한 사람들 목록
router.get('/received', authMiddleware, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id)
      .populate('likedByUsers', 'nickname age gender college mbti profileImage aiScore')
      .lean();

    if (!currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 좋아요 받은 사용자 목록에 추가 정보 포함
    const users = currentUser.likedByUsers.map(user => ({
      ...user,
      id: user._id,
      likesCount: 0, // 필요시 계산 가능
      isLikedByMe: currentUser.likedUsers.some(id => id.equals(user._id)),
      isMutual: currentUser.likedUsers.some(id => id.equals(user._id)) // 상호 좋아요 여부
    }));

    res.json({ success: true, users, count: users.length });
  } catch (error) {
    next(error);
  }
});

// 읽지 않은 좋아요 수 (간단 버전)
router.get('/count', authMiddleware, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id).select('likedByUsers');

    if (!currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const count = currentUser.likedByUsers?.length || 0;

    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
