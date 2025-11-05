import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesAPI } from '../services/api';
import './MatchesPage.css';

const MatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await matchesAPI.getMatches();
      setMatches(res.data.matches);
    } catch (error) {
      console.error('매칭 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMatch = async (matchId, matchedUserName, e) => {
    e.stopPropagation(); // 클릭 이벤트 버블링 방지

    const confirmMessage = `정말로 ${matchedUserName}님과의 매칭을 취소하시겠습니까?\n\n⚠️ 주의:\n- 채팅 메시지가 모두 삭제됩니다\n- 다시 매칭하려면 서로 다시 좋아요를 눌러야 합니다\n- 이 작업은 되돌릴 수 없습니다`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🗑️ 매칭 취소 시도:', matchId);
      const response = await matchesAPI.deleteMatch(matchId);
      console.log('✅ 매칭 취소 성공:', response.data);
      alert('매칭이 취소되었습니다');

      // UI에서 제거
      setMatches(matches.filter(match => match.matchId !== matchId));
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
  
  const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
  
  return (
    <div className="matches-page">
      <header className="matches-header">
        <button onClick={() => navigate('/')} className="back-btn">← 뒤로</button>
        <h1>매칭 목록</h1>
        <div></div>
      </header>
      
      <div className="matches-list">
        {matches.length === 0 ? (
          <div className="no-matches">
            <p>아직 매칭된 사용자가 없습니다.</p>
            <button onClick={() => navigate('/')}>사용자 탐색하기</button>
          </div>
        ) : (
          matches.map(match => {
            // Cloudinary URL 지원
            const getImageUrl = (profileImage) => {
              if (!profileImage) return '/default-avatar.png';
              if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
                return profileImage;
              }
              return `${API_BASE}${profileImage}`;
            };

            return (
              <div
                key={match.matchId}
                className="match-item"
                onClick={() => navigate(`/chat/${match.matchId}`)}
              >
                <img
                  src={getImageUrl(match.matchedUser.profileImage)}
                  alt={match.matchedUser.nickname}
                  onError={(e) => e.target.src = '/default-avatar.png'}
                />
                <div className="match-info">
                  <h3>{match.matchedUser.nickname}</h3>
                  <p className="last-message">
                    {match.lastMessage
                      ? match.lastMessage.text
                      : '아직 대화가 없습니다.'}
                  </p>
                </div>
                {match.unreadCount > 0 && (
                  <span className="unread-badge">{match.unreadCount}</span>
                )}
                <button
                  className="cancel-match-btn"
                  onClick={(e) => handleCancelMatch(match.matchId, match.matchedUser.nickname, e)}
                  title="매칭 취소"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
