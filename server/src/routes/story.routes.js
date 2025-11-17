const express = require('express');
const Story = require('../models/Story');
const Match = require('../models/Match');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const upload = require('../config/multer');
const router = express.Router();

// 스토리 업로드
router.post('/', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지를 업로드해주세요' });
    }

    const { caption } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`; // 로컬 경로

    console.log(`📸 스토리 업로드 - 사용자: ${req.user.id}, 이미지: ${imageUrl}`);

    const story = await Story.create({
      user: req.user.id,
      imageUrl,
      caption: caption || ''
    });

    await story.populate('user', 'nickname profileImage');

    console.log(`✅ 스토리 생성 완료 - ID: ${story._id}`);

    res.json({
      success: true,
      message: '스토리가 업로드되었습니다',
      story
    });
  } catch (error) {
    console.error('❌ 스토리 업로드 실패:', error);
    next(error);
  }
});

// 매칭된 사람들의 스토리 목록 조회 (메인 피드)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    console.log(`📚 스토리 피드 조회 - 사용자: ${userId}`);

    // 내가 포함된 모든 매칭 조회
    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }]
    });

    // 매칭된 사용자 ID 추출
    const matchedUserIds = matches.map(match =>
      match.user1.toString() === userId ? match.user2 : match.user1
    );

    // 나 자신도 포함
    matchedUserIds.push(userId);

    console.log(`👥 매칭된 사용자 수: ${matchedUserIds.length - 1}명`);

    // 매칭된 사용자들의 만료되지 않은 스토리 조회
    const stories = await Story.find({
      user: { $in: matchedUserIds },
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'nickname profileImage')
      .sort({ createdAt: -1 });

    // 사용자별로 그룹화
    const storiesByUser = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = {
          user: story.user,
          stories: [],
          hasUnviewed: false
        };
      }

      // 안본 스토리가 있는지 확인
      const hasViewed = story.viewedBy.some(v => v.user.toString() === req.user.id);
      if (!hasViewed) {
        storiesByUser[userId].hasUnviewed = true;
      }

      storiesByUser[userId].stories.push(story);
    });

    const groupedStories = Object.values(storiesByUser);

    console.log(`📚 스토리 응답 - 사용자 수: ${groupedStories.length}, 전체 스토리 수: ${stories.length}`);

    res.json({
      success: true,
      stories: groupedStories,
      totalUsers: groupedStories.length,
      totalStories: stories.length
    });
  } catch (error) {
    console.error('❌ 스토리 피드 조회 실패:', error);
    next(error);
  }
});

// 특정 사용자의 스토리 목록 조회
router.get('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    console.log(`📖 사용자 스토리 조회 - 조회자: ${currentUserId}, 대상: ${targetUserId}`);

    // 매칭 확인 (본인이거나 매칭된 사용자만 볼 수 있음)
    if (currentUserId !== targetUserId) {
      const match = await Match.findOne({
        $or: [
          { user1: currentUserId, user2: targetUserId },
          { user1: targetUserId, user2: currentUserId }
        ]
      });

      if (!match) {
        return res.status(403).json({ error: '매칭되지 않은 사용자의 스토리는 볼 수 없습니다' });
      }
    }

    // 만료되지 않은 스토리 조회
    const stories = await Story.find({
      user: targetUserId,
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'nickname profileImage')
      .sort({ createdAt: 1 }); // 오래된 것부터

    console.log(`📖 스토리 ${stories.length}개 찾음`);

    res.json({
      success: true,
      stories
    });
  } catch (error) {
    console.error('❌ 사용자 스토리 조회 실패:', error);
    next(error);
  }
});

// 스토리 조회 기록
router.put('/:storyId/view', authMiddleware, async (req, res, next) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user.id;

    console.log(`👁️  스토리 조회 기록 - 사용자: ${userId}, 스토리: ${storyId}`);

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });
    }

    // 이미 조회했는지 확인
    const alreadyViewed = story.viewedBy.some(v => v.user.toString() === userId);

    if (!alreadyViewed) {
      story.viewedBy.push({ user: userId, viewedAt: new Date() });
      await story.save();

      console.log(`✅ 조회 기록 추가 - 총 조회자: ${story.viewedBy.length}명`);
    } else {
      console.log(`⚠️  이미 조회한 스토리`);
    }

    res.json({
      success: true,
      message: '조회 기록이 저장되었습니다',
      viewCount: story.viewedBy.length
    });
  } catch (error) {
    console.error('❌ 스토리 조회 기록 실패:', error);
    next(error);
  }
});

// 내 스토리 삭제
router.delete('/:storyId', authMiddleware, async (req, res, next) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user.id;

    console.log(`🗑️  스토리 삭제 요청 - 사용자: ${userId}, 스토리: ${storyId}`);

    const story = await Story.findOne({ _id: storyId, user: userId });

    if (!story) {
      return res.status(404).json({ error: '스토리를 찾을 수 없거나 권한이 없습니다' });
    }

    await Story.findByIdAndDelete(storyId);

    console.log(`✅ 스토리 삭제 완료`);

    res.json({
      success: true,
      message: '스토리가 삭제되었습니다'
    });
  } catch (error) {
    console.error('❌ 스토리 삭제 실패:', error);
    next(error);
  }
});

// 스토리 조회자 목록
router.get('/:storyId/viewers', authMiddleware, async (req, res, next) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user.id;

    console.log(`👥 스토리 조회자 목록 - 사용자: ${userId}, 스토리: ${storyId}`);

    const story = await Story.findOne({ _id: storyId, user: userId })
      .populate('viewedBy.user', 'nickname profileImage');

    if (!story) {
      return res.status(404).json({ error: '스토리를 찾을 수 없거나 권한이 없습니다' });
    }

    const viewers = story.viewedBy.map(v => ({
      user: v.user,
      viewedAt: v.viewedAt
    }));

    console.log(`👥 조회자 ${viewers.length}명`);

    res.json({
      success: true,
      viewers,
      count: viewers.length
    });
  } catch (error) {
    console.error('❌ 조회자 목록 조회 실패:', error);
    next(error);
  }
});

module.exports = router;
