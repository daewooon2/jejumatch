const express = require('express');
const cors = require('cors');
const path = require('path');

// 라우트 import
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const usersRoutes = require('./routes/users.routes');
const likesRoutes = require('./routes/likes.routes');
const matchesRoutes = require('./routes/matches.routes');
const messagesRoutes = require('./routes/messages.routes');
const storyRoutes = require('./routes/story.routes');

// 미들웨어 import
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (업로드된 이미지)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/stories', storyRoutes);

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 에러 핸들러 (가장 마지막에 위치)
app.use(errorHandler);

module.exports = app;
