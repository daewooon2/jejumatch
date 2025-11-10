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
  const { connected, joinMatch, sendMessage: sendSocketMessage, onNewMessage, markAsRead, onMessagesRead } = useSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);

  const messagesEndRef = useRef(null);

  // 초기 메시지 로드
  useEffect(() => {
    fetchMessages();
  }, [matchId]);

  // Socket.io 실시간 메시지 수신 및 읽음 처리
  useEffect(() => {
    if (connected && matchId) {
      console.log('🔌 소켓 연결됨, 매칭방 참가:', matchId);
      joinMatch(matchId);

      // 새 메시지 수신 리스너 등록
      const handleNewMessage = (newMessage) => {
        console.log('📩 새 메시지 수신:', newMessage);
        setMessages((prev) => {
          // 중복 메시지 방지
          const exists = prev.some(msg => msg._id === newMessage._id);
          if (exists) {
            console.log('⚠️  중복 메시지, 무시');
            return prev;
          }
          console.log('✅ 메시지 추가');

          // 상대방이 보낸 메시지면 즉시 읽음 처리
          const currentUserId = user.id || user._id;
          const senderId = newMessage.sender._id || newMessage.sender;
          const isOtherMessage = senderId.toString() !== currentUserId.toString();

          if (isOtherMessage && !newMessage.isRead) {
            console.log('📖 새 메시지 읽음 처리:', newMessage._id);
            markAsRead(matchId, [newMessage._id]);
          }

          return [...prev, newMessage];
        });
      };

      // 읽음 상태 업데이트 리스너 등록
      const handleMessagesRead = ({ messageIds }) => {
        console.log('📖 메시지 읽음 알림 수신:', messageIds);
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg._id)
              ? { ...msg, isRead: true }
              : msg
          )
        );
      };

      onNewMessage(handleNewMessage);
      onMessagesRead(handleMessagesRead);

      // 채팅방 입장 시 안 읽은 메시지 모두 읽음 처리
      setMessages((prev) => {
        const currentUserId = user.id || user._id;
        const unreadMessages = prev.filter(msg => {
          const senderId = msg.sender._id || msg.sender;
          const isOtherMessage = senderId.toString() !== currentUserId.toString();
          return isOtherMessage && !msg.isRead;
        });

        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map(msg => msg._id);
          console.log('📖 채팅방 입장 시 안 읽은 메시지 읽음 처리:', unreadIds);
          markAsRead(matchId, unreadIds);
        }

        return prev;
      });

      // 클린업 함수는 useSocket에서 처리하지 않으므로 여기서는 생략
    } else {
      console.log('⚠️  소켓 연결 안 됨 또는 matchId 없음', { connected, matchId });
    }
  }, [connected, matchId, joinMatch, onNewMessage, onMessagesRead, markAsRead, user]);

  // 메시지 업데이트 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await messagesAPI.getMessages(matchId);
      console.log('📨 메시지 로드:', res.data.messages.length, '개');
      setMessages(res.data.messages);

      // 상대방 정보 추출 (첫 메시지에서)
      if (res.data.messages.length > 0) {
        const currentUserId = user.id || user._id;
        const firstMsg = res.data.messages[0];
        const senderId = firstMsg.sender._id || firstMsg.sender;

        console.log('👤 상대방 찾기:', {
          currentUserId,
          firstMsgSenderId: senderId,
          isSameUser: senderId.toString() === currentUserId.toString()
        });

        // 내가 아닌 사람을 찾을 때까지 메시지를 순회
        let other = null;
        for (const msg of res.data.messages) {
          const msgSenderId = msg.sender._id || msg.sender;
          if (msgSenderId.toString() !== currentUserId.toString()) {
            other = msg.sender;
            break;
          }
        }

        // 상대방을 찾지 못했다면 첫 메시지 발신자가 나라면 수신자가 상대방
        if (!other && res.data.messages[0].receiver) {
          other = res.data.messages[0].receiver;
        }

        console.log('👤 상대방:', other?.nickname || '없음');
        setOtherUser(other);
      }
    } catch (error) {
      console.error('❌ 메시지 로드 실패:', error);
      alert('메시지를 불러올 수 없습니다');
      navigate('/matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    const messageText = inputText;
    setInputText(''); // 입력창 즉시 비우기

    try {
      // Socket.io로 실시간 전송 (소켓 핸들러에서 DB 저장 및 브로드캐스트)
      if (connected) {
        console.log('📤 소켓으로 메시지 전송:', messageText);
        sendSocketMessage(matchId, messageText);
      } else {
        // Socket 연결 안 되어 있으면 REST API 폴백
        console.log('📤 REST API로 메시지 전송:', messageText);
        const res = await messagesAPI.sendMessage(matchId, messageText);
        // 수동으로 메시지 추가
        setMessages([...messages, res.data.message]);
      }
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
      alert('메시지 전송 실패');
      setInputText(messageText); // 실패 시 메시지 복구
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
            // user.id 또는 user._id 둘 다 처리
            const currentUserId = user.id || user._id;
            const senderId = msg.sender._id || msg.sender;
            const isMyMessage = senderId.toString() === currentUserId.toString();

            console.log('💬 메시지 렌더링:', {
              messageId: msg._id,
              senderId,
              currentUserId,
              isMyMessage,
              senderName: msg.sender.nickname
            });

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
                      <span className={`read-status ${!msg.isRead ? 'unread' : ''}`}>
                        {msg.isRead ? '✓✓' : '✓'}
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
