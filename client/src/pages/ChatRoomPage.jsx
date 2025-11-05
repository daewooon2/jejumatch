import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messagesAPI, matchesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import './ChatRoomPage.css';

const ChatRoomPage = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { connected, joinMatch, sendMessage: sendSocketMessage, onNewMessage } = useSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);

  const messagesEndRef = useRef(null);

  // 초기 메시지 로드
  useEffect(() => {
    fetchMessages();
  }, [matchId]);

  // Socket.io 실시간 메시지 수신
  useEffect(() => {
    if (connected && matchId) {
      joinMatch(matchId);

      // 새 메시지 수신 리스너
      onNewMessage((newMessage) => {
        console.log('📩 새 메시지 수신:', newMessage);
        setMessages((prev) => [...prev, newMessage]);
      });
    }
  }, [connected, matchId]);

  // 메시지 업데이트 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await messagesAPI.getMessages(matchId);
      setMessages(res.data.messages);

      // 상대방 정보 추출 (첫 메시지에서)
      if (res.data.messages.length > 0) {
        const firstMsg = res.data.messages[0];
        const other = firstMsg.sender._id === user.id ? null : firstMsg.sender;
        setOtherUser(other);
      }
    } catch (error) {
      alert('메시지를 불러올 수 없습니다');
      navigate('/matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    try {
      // REST API로 메시지 전송 (DB 저장)
      const res = await messagesAPI.sendMessage(matchId, inputText);

      // Socket.io로 실시간 전송 (상대방에게 즉시 알림)
      if (connected) {
        sendSocketMessage(matchId, inputText);
      } else {
        // Socket 연결 안 되어 있으면 수동으로 추가
        setMessages([...messages, res.data.message]);
      }

      setInputText('');
    } catch (error) {
      alert('메시지 전송 실패');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 이미지 URL 처리 함수 (Cloudinary URL 지원)
  const getImageUrl = (profileImage) => {
    if (!profileImage) return '/default-avatar.png';
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      return profileImage;
    }
    const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    return `${API_BASE}${profileImage}`;
  };

  // 매칭 취소
  const handleCancelMatch = async () => {
    const confirmMessage = `정말로 ${otherUser?.nickname || '상대방'}님과의 매칭을 취소하시겠습니까?\n\n⚠️ 주의:\n- 모든 채팅 메시지가 삭제됩니다\n- 다시 매칭하려면 서로 다시 좋아요를 눌러야 합니다\n- 이 작업은 되돌릴 수 없습니다`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🗑️ 매칭 취소 시도:', matchId);
      const response = await matchesAPI.deleteMatch(matchId);
      console.log('✅ 매칭 취소 성공:', response.data);
      alert('매칭이 취소되었습니다');
      navigate('/matches');
    } catch (error) {
      console.error('❌ 매칭 취소 실패:', error);
      console.error('에러 상세:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      alert(error.response?.data?.error || '매칭 취소에 실패했습니다');
    }
  };
  
  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }
  
  return (
    <div className="chat-room">
      <div className="chat-header">
        <button onClick={() => navigate('/matches')}>← 뒤로</button>
        <h3>{otherUser?.nickname || '채팅방'}</h3>
        <div className="header-right">
          <div className="connection-status" title={connected ? '연결됨' : '연결 끊김'}>
            {connected ? '🟢' : '🔴'}
          </div>
          <button
            onClick={handleCancelMatch}
            className="cancel-match-btn-header"
            title="매칭 취소"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>아직 대화가 없습니다.</p>
            <p>첫 메시지를 보내보세요! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.sender._id === user.id;

            return (
              <div
                key={msg._id}
                className={isMyMessage ? 'my-message' : 'other-message'}
              >
                {/* 상대방 메시지: 프로필 사진 표시 */}
                {!isMyMessage && (
                  <img
                    src={getImageUrl(msg.sender.profileImage)}
                    alt={msg.sender.nickname}
                    className="sender-avatar"
                    onError={(e) => (e.target.src = '/default-avatar.png')}
                  />
                )}

                <div className="message-content">
                  {/* 상대방 이름 표시 */}
                  {!isMyMessage && (
                    <span className="sender-name">{msg.sender.nickname}</span>
                  )}

                  <p>{msg.text}</p>

                  <div className="message-footer">
                    <span className="timestamp">
                      {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {/* 내 메시지: 읽음 표시 */}
                    {isMyMessage && (
                      <span className="read-status">
                        {msg.isRead ? '읽음' : '안읽음'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="메시지를 입력하세요..."
        />
        <button type="submit" disabled={!inputText.trim()}>
          전송
        </button>
      </form>
    </div>
  );
};

export default ChatRoomPage;
