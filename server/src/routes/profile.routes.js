const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const upload = require('../config/multer');
const { evaluateWithAI } = require('../services/aiScoring.service');
const router = express.Router();

// 내 프로필 조회
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// 프로필 수정
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const allowedFields = ['nickname', 'college', 'major', 'mbti', 'hobbies', 'region'];
    const updates = {};
    
    // 허용된 필드만 업데이트
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // 닉네임 변경 시 중복 체크
    if (updates.nickname) {
      const existing = await User.findOne({ 
        nickname: updates.nickname,
        _id: { $ne: req.user.id }
      });
      
      if (existing) {
        return res.status(400).json({ error: '이미 사용 중인 닉네임입니다' });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({ success: true, message: '프로필 수정 완료', user });
  } catch (error) {
    next(error);
  }
});

// 프로필 사진 업로드
router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 업로드해주세요' });
    }

    // Cloudinary에 업로드된 이미지 URL
    const imageUrl = req.file.path;

    // AI 평가 (개발 초기에는 랜덤 점수)
    const aiScore = await evaluateWithAI(imageUrl);

    // 사용자 프로필 업데이트
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        profileImage: imageUrl,
        aiScore
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      imageUrl,
      aiScore,
      user
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
