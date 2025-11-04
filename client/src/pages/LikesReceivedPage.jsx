import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { likesAPI } from '../services/api';
import UserCard from '../components/UserCard';
import './LikesReceivedPage.css';

const LikesReceivedPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReceivedLikes();
  }, []);

  const fetchReceivedLikes = async () => {
    try {
      setLoading(true);
      const res = await likesAPI.getReceivedLikes();
      setUsers(res.data.users);
    } catch (error) {
      console.error('좋아요 받은 목록 로드 실패:', error);
      alert('목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (userId) => {
    try {
      const res = await likesAPI.likeUser(userId);

      // UI 업데이트
      setUsers(users.map(user =>
        (user.id === userId || user._id === userId)
          ? { ...user, isLikedByMe: true, isMutual: true }
          : user
      ));

      // 매칭 성공 시
      if (res.data.isMatched) {
        alert('🎉 매칭 성공! 채팅을 시작할 수 있습니다.');
        navigate(`/chat/${res.data.matchId}`);
      } else {
        alert('좋아요를 보냈습니다! 💌');
      }
    } catch (error) {
      alert(error.response?.data?.error || '좋아요 실패');
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="likes-received-page">
      <header className="likes-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← 뒤로
        </button>
        <h1>나를 좋아하는 사람들</h1>
        <div></div>
      </header>

      {users.length === 0 ? (
        <div className="no-likes">
          <p>아직 좋아요를 받지 못했어요 😢</p>
          <p>프로필을 더 멋지게 꾸며보세요!</p>
          <button onClick={() => navigate('/my-profile')} className="goto-profile-btn">
            내 프로필 수정하기
          </button>
        </div>
      ) : (
        <>
          <div className="likes-info">
            <p>총 {users.length}명이 나를 좋아합니다 💖</p>
            <p className="hint">💡 상호 좋아요를 누르면 매칭됩니다!</p>
          </div>

          <div className="users-grid">
            {users.map(user => (
              <div key={user.id || user._id} className="user-card-wrapper">
                <UserCard
                  user={user}
                  onLike={handleLike}
                  onClick={() => navigate(`/profile/${user.id || user._id}`)}
                />
                {user.isMutual && (
                  <div className="mutual-badge">💕 상호 좋아요</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LikesReceivedPage;
