import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersAPI, likesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './ProfileViewPage.css';

const ProfileViewPage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getUser(userId);
      setUser(res.data.user);
      setIsLiked(res.data.user.isLikedByMe || false);
    } catch (error) {
      console.error('프로필 로드 실패:', error);
      alert('프로필을 불러올 수 없습니다');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await likesAPI.likeUser(userId);

      if (res.data.isMatched) {
        alert('🎉 매칭 성공! 채팅을 시작할 수 있습니다.');
        navigate(`/chat/${res.data.matchId}`);
      } else {
        alert('좋아요를 보냈습니다! 💌');
        setIsLiked(true);
      }
    } catch (error) {
      alert(error.response?.data?.error || '좋아요 실패');
    }
  };

  const handleUnlike = async () => {
    try {
      await likesAPI.unlikeUser(userId);
      alert('좋아요를 취소했습니다');
      setIsLiked(false);
    } catch (error) {
      alert(error.response?.data?.error || '좋아요 취소 실패');
    }
  };

  const getImageUrl = (profileImage) => {
    if (!profileImage) return '/default-avatar.png';
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      return profileImage;
    }
    const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    return `${API_BASE}${profileImage}`;
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!user) {
    return <div className="error">사용자를 찾을 수 없습니다</div>;
  }

  return (
    <div className="profile-view-page">
      <header className="profile-view-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← 뒤로
        </button>
        <h1>프로필</h1>
        <div></div>
      </header>

      <div className="profile-view-container">
        <div className="profile-image-section">
          <img
            src={getImageUrl(user.profileImage)}
            alt={user.nickname}
            className="profile-image"
            onError={(e) => (e.target.src = '/default-avatar.png')}
          />
          {user.aiScore && (
            <div className="ai-score-badge">
              AI 점수: {user.aiScore}점
            </div>
          )}
        </div>

        <div className="profile-info-section">
          <h2>{user.nickname}</h2>
          <div className="profile-details">
            {user.age && <p>📅 {user.age}세</p>}
            {user.gender && <p>👤 {user.gender === 'male' ? '남성' : '여성'}</p>}
            {user.college && <p>🏫 {user.college}</p>}
            {user.major && <p>📚 {user.major}</p>}
            {user.mbti && <p>🧠 {user.mbti}</p>}
            {user.region && <p>📍 {user.region}</p>}
            {user.hobbies && <p>🎨 {user.hobbies}</p>}
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-label">받은 좋아요</span>
              <span className="stat-value">{user.likesCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {currentUser.id === userId || currentUser._id === userId ? (
            <button onClick={() => navigate('/my-profile')} className="edit-btn">
              내 프로필 수정
            </button>
          ) : (
            <>
              {isLiked ? (
                <button onClick={handleUnlike} className="unlike-btn">
                  💔 좋아요 취소
                </button>
              ) : (
                <button onClick={handleLike} className="like-btn">
                  💖 좋아요
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileViewPage;
