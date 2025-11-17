const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    maxlength: 200
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 24시간 후 자동 삭제를 위한 TTL 인덱스
// MongoDB가 expiresAt 시간이 되면 자동으로 문서 삭제
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 사용자별로 스토리 조회 시 최적화
storySchema.index({ user: 1, createdAt: -1 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
