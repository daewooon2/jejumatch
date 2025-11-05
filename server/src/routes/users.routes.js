const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

// 사용자 탐색 (필터링, 정렬)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // 기본 필터: 본인 제외 + 이성만
    let query = {
      _id: { $ne: req.user.id },
      gender: { $ne: currentUser.gender }
    };
    
    // 추가 필터 적용
    if (req.query.mbti) {
      query.mbti = req.query.mbti;
    }
    
    if (req.query.region) {
      query.region = req.query.region;
    }
    
    if (req.query.hobbies) {
      const hobbies = req.query.hobbies.split(',');
      query.hobbies = { $in: hobbies };
    }
    
    // 사용자 조회 (likesCount 계산을 위해 likedByUsers 포함)
    let users = await User.find(query)
      .select('-password -email -likedUsers')
      .lean();

    console.log(`👥 [DEBUG] 조회된 사용자 수: ${users.length}`);
    if (users.length > 0) {
      console.log(`👥 [DEBUG] 첫 번째 사용자 likedByUsers:`, users[0].likedByUsers);
    }

    // 좋아요 수 및 내가 좋아요 했는지 추가
    users = users.map(user => {
      const likesCount = user.likedByUsers?.length || 0;
      console.log(`👥 [DEBUG] ${user.nickname}: likesCount = ${likesCount}`);

      return {
        ...user,
        id: user._id,
        likesCount,
        isLikedByMe: currentUser.likedUsers.some(id => id.equals(user._id)),
        // 보안: likedByUsers 배열은 클라이언트에 전송하지 않음
        likedByUsers: undefined
      };
    });
    
    // 정렬
    const sortBy = req.query.sortBy || 'likes';
    
    if (sortBy === 'likes') {
      users.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sortBy === 'aiScore') {
      users.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    } else {
      users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// 특정 사용자 상세 조회
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const user = await User.findById(req.params.id)
      .select('-password -email')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    
    // 좋아요 정보 추가
    user.id = user._id;
    user.likesCount = user.likedByUsers?.length || 0;
    user.isLikedByMe = currentUser.likedUsers.some(id => id.equals(user._id));
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
