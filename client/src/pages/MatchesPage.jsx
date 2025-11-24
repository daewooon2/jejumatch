import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesAPI, storyAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import StoryViewer from '../components/Story/StoryViewer';
import StoryUpload from '../components/Story/StoryUpload';
import './MatchesPage.css';

const MatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingStories, setViewingStories] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { onStoryUpdate } = useSocket();

  useEffect(() => {
    fetchMatches();
    fetchStories();
  }, []);

  // Socket.io 실시간 스토리 업데이트 리스너
  useEffect(() => {
    const handleStoryUpdate = (data) => {
      console.log('📢 스토리 업데이트 이벤트 수신:', data);

      // 다른 사용자의 스토리 변경 시 자동으로 목록 새로고침
      if (data.action === 'uploaded' || data.action === 'deleted') {
        fetchStories();
      }
    };

    // 리스너 등록
    if (onStoryUpdate) {
      onStoryUpdate(handleStoryUpdate);
    }

    // 클린업
    return () => {
      // Socket.io 리스너는 useSocket 내부에서 관리됨
    };
  }, [onStoryUpdate]);

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

  const fetchStories = async () => {
    try {
      const res = await storyAPI.getStories();
      console.log('스토리 로드 성공:', res.data);
      setStories(res.data.stories || []);
      return res.data.stories || [];
    } catch (error) {
      console.error('스토리 로드 실패:', error);
      setStories([]);
      return [];
    }
  };

  const openStoryViewer = (storyList) => {
    if (storyList && storyList.length > 0) {
      setViewingStories(storyList);
    }
  };

  const handleStoryDelete = async (deletedStoryId) => {
    // 삭제된 스토리를 목록에서 즉시 제거
    console.log('스토리 삭제됨:', deletedStoryId);

    // 먼저 로컬 상태를 업데이트 (즉시 반영)
    setStories(prevStories =>
      prevStories.filter(group =>
        group.stories.some(story => story._id !== deletedStoryId)
      )
    );

    // 그 다음 서버에서 최신 데이터 가져오기
    await fetchStories();
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
  
  const getImageUrl = (profileImage) => {
    if (!profileImage) return '/default-avatar.png';
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      return profileImage;
    }
    const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    return `${API_BASE}${profileImage}`;
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <div className="matches-page">
      <header className="matches-header">
        <button onClick={() => navigate('/')} className="back-btn">← 뒤로</button>
        <h1>매칭 목록</h1>
        <div></div>
      </header>

      {/* 스토리 섹션 */}
      {!loading && (
        <div className="stories-section">
          <h2>스토리</h2>
          <div className="stories-grid">
            {/* 내 스토리 추가 버튼 */}
            <div className="story-card add-story-card" onClick={() => setShowUpload(true)}>
              <div className="story-thumbnail add-thumbnail">
                <span>+</span>
              </div>
              <p className="story-user-name">내 스토리</p>
            </div>

            {/* 친구들 스토리 */}
            {stories.map((storyGroup) => {
              console.log('스토리 그룹:', storyGroup);
              if (!storyGroup || !storyGroup.stories || storyGroup.stories.length === 0) {
                return null;
              }
              return (
                <div
                  key={storyGroup.user?._id || Math.random()}
                  className="story-card"
                  onClick={() => {
                    console.log('스토리 클릭:', storyGroup.stories);
                    openStoryViewer(storyGroup.stories);
                  }}
                >
                  <div className="story-thumbnail">
                    <img
                      src={getImageUrl(storyGroup.stories[0]?.imageUrl)}
                      alt={storyGroup.user?.nickname || '사용자'}
                      onError={(e) => (e.target.src = '/default-avatar.png')}
                    />
                    {storyGroup.hasUnviewed && (
                      <span className="new-badge">NEW</span>
                    )}
                  </div>
                  <p className="story-user-name">{storyGroup.user?.nickname || '알 수 없음'}</p>
                  <p className="story-time">{formatTime(storyGroup.stories[0]?.createdAt)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="matches-list">
        {matches.length === 0 ? (
          <div className="no-matches">
            <p>아직 매칭된 사용자가 없습니다.</p>
            <button onClick={() => navigate('/')}>사용자 탐색하기</button>
          </div>
        ) : (
          matches.map(match => {
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

      {/* 스토리 업로드 모달 */}
      {showUpload && (
        <StoryUpload
          onClose={() => setShowUpload(false)}
          onSuccess={async () => {
            console.log('스토리 업로드 성공, 목록 새로고침 중...');
            await fetchStories();
            setShowUpload(false);
          }}
        />
      )}

      {/* 스토리 뷰어 */}
      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          onClose={() => setViewingStories(null)}
          onDelete={handleStoryDelete}
        />
      )}
    </div>
  );
};

export default MatchesPage;
