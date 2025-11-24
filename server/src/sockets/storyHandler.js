const Story = require('../models/Story');
const Match = require('../models/Match');
const { verifyToken } = require('../config/jwt');

// Socket.io 스토리 댓글 핸들러
const storyHandler = (io) => {
  // 스토리 변경 알림 (업로드/삭제 시 서버에서 호출)
  io.emitStoryUpdate = async (userId, action, data) => {
    try {
      // 해당 사용자와 매치된 모든 사용자들에게 알림
      const matches = await Match.find({
        $or: [{ user1: userId }, { user2: userId }]
      });

      const userIds = new Set([userId]); // 본인 포함
      matches.forEach(match => {
        userIds.add(match.user1.toString());
        userIds.add(match.user2.toString());
      });

      // 각 사용자의 소켓에 알림 전송
      userIds.forEach(uid => {
        io.to(`user-${uid}`).emit('story-update', {
          action,
          userId,
          data
        });
      });

      console.log(`📢 스토리 ${action} 알림 전송 - 사용자: ${userId}`);
    } catch (error) {
      console.error('❌ 스토리 업데이트 알림 실패:', error);
    }
  };

  // chatHandler에서 이미 connection과 authenticate를 처리하므로,
  // 여기서는 기존 socket에 스토리 관련 이벤트만 추가
  io.on('connection', (socket) => {
    console.log('📸 스토리 소켓 이벤트 등록:', socket.id);

    // 스토리 룸 참가 (스토리 뷰어 열 때)
    socket.on('join-story', async (storyId) => {
      try {
        if (!socket.userId) {
          return socket.emit('error', '인증이 필요합니다');
        }

        // 스토리 존재 확인
        const story = await Story.findById(storyId);
        if (!story) {
          return socket.emit('error', '스토리를 찾을 수 없습니다');
        }

        // 매칭된 사용자인지 확인 (본인 또는 매칭된 사용자만 볼 수 있음)
        const storyUserId = story.user.toString();
        if (storyUserId !== socket.userId) {
          const match = await Match.findOne({
            $or: [
              { user1: socket.userId, user2: storyUserId },
              { user1: storyUserId, user2: socket.userId }
            ]
          });

          if (!match) {
            return socket.emit('error', '스토리 접근 권한이 없습니다');
          }
        }

        // 스토리 룸에 참가
        const roomName = `story-${storyId}`;
        socket.join(roomName);
        console.log(`✅ ${socket.userId}가 스토리 룸 ${roomName}에 입장`);

      } catch (error) {
        console.error('❌ 스토리 룸 참가 실패:', error);
        socket.emit('error', '스토리 룸 참가 실패');
      }
    });

    // 스토리 룸 나가기
    socket.on('leave-story', (storyId) => {
      if (!storyId) return;
      const roomName = `story-${storyId}`;
      socket.leave(roomName);
      console.log(`👋 ${socket.userId}가 스토리 룸 ${roomName}에서 퇴장`);
    });

    // 댓글 추가 실시간 전송
    socket.on('add-story-comment', async (data) => {
      try {
        const { storyId, comment } = data;

        if (!socket.userId) {
          return socket.emit('error', '인증이 필요합니다');
        }

        console.log(`💬 댓글 추가 - userId: ${socket.userId}, storyId: ${storyId}`);

        // 스토리 확인
        const story = await Story.findById(storyId);
        if (!story) {
          return socket.emit('error', '스토리를 찾을 수 없습니다');
        }

        const roomName = `story-${storyId}`;

        // 같은 스토리를 보고 있는 모든 사용자에게 실시간 전송
        io.to(roomName).emit('story-comment-added', {
          storyId,
          comment,
          userId: socket.userId
        });

        console.log(`📤 댓글 브로드캐스트 완료 - roomName: ${roomName}`);

      } catch (error) {
        console.error('❌ 댓글 추가 실시간 전송 실패:', error);
        socket.emit('error', '댓글 추가 실시간 전송 실패');
      }
    });

    // 댓글 삭제 실시간 전송
    socket.on('delete-story-comment', async (data) => {
      try {
        const { storyId, commentId } = data;

        if (!socket.userId) {
          return socket.emit('error', '인증이 필요합니다');
        }

        console.log(`🗑️ 댓글 삭제 - userId: ${socket.userId}, storyId: ${storyId}, commentId: ${commentId}`);

        const roomName = `story-${storyId}`;

        // 같은 스토리를 보고 있는 모든 사용자에게 실시간 전송
        io.to(roomName).emit('story-comment-deleted', {
          storyId,
          commentId,
          userId: socket.userId
        });

        console.log(`📤 댓글 삭제 브로드캐스트 완료 - roomName: ${roomName}`);

      } catch (error) {
        console.error('❌ 댓글 삭제 실시간 전송 실패:', error);
        socket.emit('error', '댓글 삭제 실시간 전송 실패');
      }
    });

    // 좋아요 실시간 전송
    socket.on('toggle-story-like', async (data) => {
      try {
        const { storyId, isLiked, likeCount } = data;

        if (!socket.userId) {
          return socket.emit('error', '인증이 필요합니다');
        }

        console.log(`❤️ 좋아요 토글 - userId: ${socket.userId}, storyId: ${storyId}, isLiked: ${isLiked}`);

        const roomName = `story-${storyId}`;

        // 같은 스토리를 보고 있는 모든 사용자에게 실시간 전송
        io.to(roomName).emit('story-like-toggled', {
          storyId,
          userId: socket.userId,
          isLiked,
          likeCount
        });

        console.log(`📤 좋아요 브로드캐스트 완료 - roomName: ${roomName}`);

      } catch (error) {
        console.error('❌ 좋아요 실시간 전송 실패:', error);
        socket.emit('error', '좋아요 실시간 전송 실패');
      }
    });
  });
};

module.exports = storyHandler;