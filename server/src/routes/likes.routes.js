const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const { createMatch, checkMutualLike } = require('../services/match.service');
const router = express.Router();

// ===== 주의: 라우트 순서 중요! =====
// '/received', '/count' 같은 정적 라우트는 '/:userId' 같은 동적 라우트보다 먼저 등록해야 함

// 나를 좋아요한 사람들 목록
router.get('/received', authMiddleware, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id)
      .populate('likedByUsers', 'nickname age gender college mbti profileImage aiScore')
      .lean();

    if (!currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    console.log(`📊 [DEBUG] 받은 좋아요 조회 - 사용자: ${req.user.id}`);
    console.log(`📊 [DEBUG] likedByUsers 수: ${currentUser.likedByUsers?.length || 0}`);

    // 좋아요 받은 사용자 목록에 추가 정보 포함
    const users = currentUser.likedByUsers.map(user => ({
      ...user,
      id: user._id,
      likesCount: 0, // 필요시 계산 가능
      isLikedByMe: currentUser.likedUsers.some(id => id.equals(user._id)),
      isMutual: currentUser.likedUsers.some(id => id.equals(user._id)) // 상호 좋아요 여부
    }));

    console.log(`📊 [DEBUG] 응답 데이터:`, users.map(u => u.nickname));

    res.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error('❌ [ERROR] 받은 좋아요 조회 실패:', error);
    next(error);
  }
});

// 읽지 않은 좋아요 수
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

    console.log(`💖 [DEBUG] 좋아요 추가: ${currentUser.nickname} → ${targetUser.nickname}`);
    console.log(`💖 [DEBUG] 좋아요 전 ${targetUser.nickname}의 likedByUsers 수: ${targetUser.likedByUsers.length}`);

    // 좋아요 추가
    currentUser.likedUsers.push(targetUserId);
    targetUser.likedByUsers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    console.log(`💖 [DEBUG] 좋아요 후 ${targetUser.nickname}의 likedByUsers 수: ${targetUser.likedByUsers.length}`);

    // 상호 좋아요 체크
    const isMatched = await checkMutualLike(currentUserId, targetUserId);

    let matchId = null;
    if (isMatched) {
      const match = await createMatch(currentUserId, targetUserId);
      matchId = match._id;
      console.log(`🎉 [DEBUG] 매칭 성공! Match ID: ${matchId}`);
    }

    res.json({
      success: true,
      message: '좋아요 완료',
      isMatched,
      matchId
    });
  } catch (error) {
    console.error('❌ [ERROR] 좋아요 추가 실패:', error);
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

module.exports = router;
