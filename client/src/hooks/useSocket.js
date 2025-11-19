import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      console.log('⚠️  토큰 없음, 소켓 연결 안 함');
      return;
    }

    console.log('🔌 Socket 연결 시도:', SOCKET_URL);

    // Socket 연결
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // WebSocket 우선, 폴백으로 polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket 연결됨, Socket ID:', socketRef.current.id);
      setConnected(true);

      // 인증
      console.log('🔑 Socket 인증 시도');
      socketRef.current.emit('authenticate', token);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket 연결 해제');
      setConnected(false);
    });

    socketRef.current.on('error', (error) => {
      console.error('❌ Socket 에러:', error);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket 연결 에러:', error);
    });

    // 클린업
    return () => {
      console.log('🧹 Socket 클린업');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  const joinMatch = useCallback((matchId) => {
    if (socketRef.current && connected) {
      console.log('🚪 매칭방 참가 요청:', matchId);
      socketRef.current.emit('join-match', matchId);
    } else {
      console.log('⚠️  소켓 연결 안 됨, 매칭방 참가 불가');
    }
  }, [connected]);

  const sendMessage = useCallback((matchId, text) => {
    if (socketRef.current && connected) {
      console.log('📤 메시지 전송:', { matchId, text });
      socketRef.current.emit('send-message', { matchId, text });
    } else {
      console.log('⚠️  소켓 연결 안 됨, 메시지 전송 불가');
    }
  }, [connected]);

  const onNewMessage = useCallback((callback) => {
    if (socketRef.current) {
      console.log('👂 new-message 리스너 등록');
      // 기존 리스너 제거 (중복 방지)
      socketRef.current.off('new-message');
      // 새 리스너 등록
      socketRef.current.on('new-message', callback);
    } else {
      console.log('⚠️  소켓 없음, 리스너 등록 불가');
    }
  }, []);

  const markAsRead = useCallback((matchId, messageIds) => {
    if (socketRef.current && connected) {
      console.log('📖 메시지 읽음 처리 요청:', { matchId, messageIds });
      socketRef.current.emit('mark-as-read', { matchId, messageIds });
    } else {
      console.log('⚠️  소켓 연결 안 됨, 읽음 처리 불가');
    }
  }, [connected]);

  const onMessagesRead = useCallback((callback) => {
    if (socketRef.current) {
      console.log('👂 messages-read 리스너 등록');
      // 기존 리스너 제거 (중복 방지)
      socketRef.current.off('messages-read');
      // 새 리스너 등록
      socketRef.current.on('messages-read', callback);
    } else {
      console.log('⚠️  소켓 없음, 리스너 등록 불가');
    }
  }, []);

  // 스토리 관련 메서드들
  const joinStory = useCallback((storyId) => {
    if (socketRef.current && connected) {
      console.log('📸 스토리 룸 참가 요청:', storyId);
      socketRef.current.emit('join-story', storyId);
    } else {
      console.log('⚠️  소켓 연결 안 됨, 스토리 룸 참가 불가');
    }
  }, [connected]);

  const leaveStory = useCallback((storyId) => {
    if (socketRef.current && connected) {
      console.log('👋 스토리 룸 퇴장:', storyId);
      socketRef.current.emit('leave-story', storyId);
    }
  }, [connected]);

  const addStoryComment = useCallback((storyId, comment) => {
    if (socketRef.current && connected) {
      console.log('💬 스토리 댓글 추가:', { storyId, comment });
      socketRef.current.emit('add-story-comment', { storyId, comment });
    }
  }, [connected]);

  const deleteStoryComment = useCallback((storyId, commentId) => {
    if (socketRef.current && connected) {
      console.log('🗑️ 스토리 댓글 삭제:', { storyId, commentId });
      socketRef.current.emit('delete-story-comment', { storyId, commentId });
    }
  }, [connected]);

  const toggleStoryLike = useCallback((storyId, isLiked, likeCount) => {
    if (socketRef.current && connected) {
      console.log('❤️ 스토리 좋아요 토글:', { storyId, isLiked, likeCount });
      socketRef.current.emit('toggle-story-like', { storyId, isLiked, likeCount });
    }
  }, [connected]);

  const onStoryCommentAdded = useCallback((callback) => {
    if (socketRef.current) {
      console.log('👂 story-comment-added 리스너 등록');
      socketRef.current.off('story-comment-added');
      socketRef.current.on('story-comment-added', callback);
    }
  }, []);

  const onStoryCommentDeleted = useCallback((callback) => {
    if (socketRef.current) {
      console.log('👂 story-comment-deleted 리스너 등록');
      socketRef.current.off('story-comment-deleted');
      socketRef.current.on('story-comment-deleted', callback);
    }
  }, []);

  const onStoryLikeToggled = useCallback((callback) => {
    if (socketRef.current) {
      console.log('👂 story-like-toggled 리스너 등록');
      socketRef.current.off('story-like-toggled');
      socketRef.current.on('story-like-toggled', callback);
    }
  }, []);

  return {
    connected,
    joinMatch,
    sendMessage,
    onNewMessage,
    markAsRead,
    onMessagesRead,
    // 스토리 관련
    joinStory,
    leaveStory,
    addStoryComment,
    deleteStoryComment,
    toggleStoryLike,
    onStoryCommentAdded,
    onStoryCommentDeleted,
    onStoryLikeToggled
  };
};
