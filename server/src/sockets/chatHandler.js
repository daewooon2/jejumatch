const Message = require('../models/Message');
const Match = require('../models/Match');
const { verifyToken } = require('../config/jwt');

// Socket.io 채팅 핸들러
const chatHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ 사용자 연결:', socket.id);
    
    // 인증
    socket.on('authenticate', async (token) => {
      try {
        const decoded = verifyToken(token);
        socket.userId = decoded.userId;
        console.log(`✅ 사용자 인증: ${socket.userId}`);
      } catch (error) {
        socket.emit('error', '인증 실패');
        socket.disconnect();
      }
    });
    
    // 채팅방 참가
    socket.on('join-match', async (matchId) => {
      try {
        // 매칭 검증
        const match = await Match.findOne({
          _id: matchId,
          $or: [{ user1: socket.userId }, { user2: socket.userId }]
        });
        
        if (!match) {
          return socket.emit('error', '접근 권한 없음');
        }
        
        socket.join(matchId);
        console.log(`✅ ${socket.userId}가 ${matchId} 방에 입장`);
      } catch (error) {
        socket.emit('error', '채팅방 참가 실패');
      }
    });
    
    // 메시지 전송
    socket.on('send-message', async (data) => {
      try {
        const { matchId, text } = data;

        console.log(`📨 메시지 수신 - userId: ${socket.userId}, matchId: ${matchId}, text: ${text}`);

        // 매칭 검증
        const match = await Match.findOne({
          _id: matchId,
          $or: [{ user1: socket.userId }, { user2: socket.userId }]
        });

        if (!match) {
          console.log(`❌ 접근 권한 없음 - userId: ${socket.userId}, matchId: ${matchId}`);
          return socket.emit('error', '접근 권한 없음');
        }

        // 수신자 확인
        const receiverId = match.user1.equals(socket.userId)
          ? match.user2
          : match.user1;

        console.log(`💾 메시지 저장 중 - sender: ${socket.userId}, receiver: ${receiverId}`);

        // 메시지 저장
        const message = await Message.create({
          matchId,
          sender: socket.userId,
          receiver: receiverId,
          text
        });

        await message.populate('sender', 'nickname profileImage');

        console.log(`📤 메시지 브로드캐스트 - matchId: ${matchId}`, message);

        // 같은 채팅방의 모든 클라이언트에게 전송
        io.to(matchId).emit('new-message', message);

      } catch (error) {
        console.error('❌ 메시지 전송 실패:', error);
        socket.emit('error', '메시지 전송 실패');
      }
    });
    
    // 메시지 읽음 처리
    socket.on('mark-as-read', async (data) => {
      try {
        const { matchId, messageIds } = data;

        console.log(`📖 메시지 읽음 처리 - userId: ${socket.userId}, matchId: ${matchId}, messageIds:`, messageIds);

        // 매칭 검증
        const match = await Match.findOne({
          _id: matchId,
          $or: [{ user1: socket.userId }, { user2: socket.userId }]
        });

        if (!match) {
          console.log(`❌ 접근 권한 없음 - userId: ${socket.userId}, matchId: ${matchId}`);
          return socket.emit('error', '접근 권한 없음');
        }

        // 메시지들을 읽음 처리 (내가 수신자인 메시지만)
        const result = await Message.updateMany(
          {
            _id: { $in: messageIds },
            receiver: socket.userId,
            isRead: false
          },
          {
            $set: { isRead: true, readAt: new Date() }
          }
        );

        console.log(`📖 읽음 처리 완료 - 업데이트된 메시지 수: ${result.modifiedCount}`);

        // 같은 채팅방의 모든 클라이언트에게 읽음 알림 전송
        io.to(matchId).emit('messages-read', {
          messageIds,
          readBy: socket.userId,
          readAt: new Date()
        });

      } catch (error) {
        console.error('❌ 메시지 읽음 처리 실패:', error);
        socket.emit('error', '메시지 읽음 처리 실패');
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('❌ 사용자 연결 해제:', socket.id);
    });
  });
};

module.exports = chatHandler;
