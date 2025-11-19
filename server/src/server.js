require('dotenv').config();
const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const chatHandler = require('./sockets/chatHandler');
const storyHandler = require('./sockets/storyHandler');

const PORT = process.env.PORT || 5000;

// MongoDB 연결
connectDB();

// HTTP 서버 생성
const server = http.createServer(app);

// Socket.io 설정
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// 소켓 핸들러 연결
chatHandler(io);
storyHandler(io);

// 서버 시작
server.listen(PORT, () => {
  console.log(`
🚀 서버가 시작되었습니다!
📡 포트: ${PORT}
🔗 URL: http://localhost:${PORT}
💾 MongoDB: ${process.env.MONGODB_URI ? '연결 중...' : '로컬'}
  `);
});
