const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  nickname: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female']
  },
  college: String,
  major: String,
  studentId: {
    type: String,
    required: true
  },
  mbti: {
    type: String,
    enum: ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
           'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ', null]
  },
  hobbies: [String],
  region: {
    type: String,
    enum: ['제주시', '서귀포시', null]
  },
  profileImage: String,
  aiScore: {
    type: Number,
    min: 1,
    max: 100,
    default: null
  },
  celebrityLookalike: {
    name: { type: String, default: null },
    confidence: { type: Number, default: null }
  },
  likedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likedByUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// 비밀번호 해싱 (저장 전)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 비밀번호 비교 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
