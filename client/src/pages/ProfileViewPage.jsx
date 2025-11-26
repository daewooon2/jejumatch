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

  // AI 점수 등급 계산
  const getScoreRating = (score) => {
    if (!score) return { stars: 0, label: '미평가', color: '#999' };
    if (score >= 90) return { stars: 5, label: '매우 매력적', color: '#ff6b6b' };
    if (score >= 80) return { stars: 4, label: '매력적', color: '#ff8c42' };
    if (score >= 70) return { stars: 3, label: '평균 이상', color: '#ffd93d' };
    if (score >= 60) return { stars: 2, label: '평균', color: '#6bcb77' };
    return { stars: 1, label: '발전 가능', color: '#4d96ff' };
  };

  // 별점 렌더링
  const renderStars = (count) => {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!user) {
    return <div className="error">사용자를 찾을 수 없습니다</div>;
  }

  const rating = getScoreRating(user.aiScore);

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
        {/* AI 점수 섹션 (프로필 사진 대신) */}
        <div className="profile-ai-score-section" style={{ '--score-color': rating.color }}>
          {user.aiScore ? (
            <>
              <div className="profile-score-circle">
                <span className="profile-score-number">{user.aiScore}</span>
                <span className="profile-score-unit">점</span>
              </div>
              <div className="profile-score-stars">{renderStars(rating.stars)}</div>
              <div className="profile-score-label">{rating.label}</div>
            </>
          ) : (
            <div className="profile-no-score">
              <span className="profile-no-score-icon">📷</span>
              <span className="profile-no-score-text">AI 평가 대기중</span>
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
            {user.hobbies && user.hobbies.length > 0 && (
              <p>🎨 {Array.isArray(user.hobbies) ? user.hobbies.join(', ') : user.hobbies}</p>
            )}
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-label">받은 좋아요</span>
              <span className="stat-value">{user.likesCount || 0}</span>
            </div>
            {user.aiScore && (
              <div className="stat-item">
                <span className="stat-label">AI 점수</span>
                <span className="stat-value" style={{ color: rating.color }}>{user.aiScore}점</span>
              </div>
            )}
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
