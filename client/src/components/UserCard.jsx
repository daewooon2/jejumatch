import React from 'react';
import './UserCard.css';

const UserCard = ({ user, onLike, onClick }) => {
  // 안전한 데이터 접근
  const nickname = user?.nickname || '알 수 없음';
  const age = user?.age || 0;
  const gender = user?.gender === 'male' ? '남성' : '여성';
  const college = user?.college;
  const mbti = user?.mbti;
  const aiScore = user?.aiScore;
  const celebrityLookalike = user?.celebrityLookalike;
  const likesCount = user?.likesCount ?? 0;
  const isLikedByMe = user?.isLikedByMe || false;
  const userId = user?.id || user?._id;

  // AI 점수 등급 계산
  const getScoreRating = (score) => {
    if (!score) return { stars: 0, label: '미평가', color: '#999' };
    if (score >= 90) return { stars: 5, label: '매우 매력적', color: '#ff6b6b' };
    if (score >= 80) return { stars: 4, label: '매력적', color: '#ff8c42' };
    if (score >= 70) return { stars: 3, label: '평균 이상', color: '#ffd93d' };
    if (score >= 60) return { stars: 2, label: '평균', color: '#6bcb77' };
    return { stars: 1, label: '발전 가능', color: '#4d96ff' };
  };

  const rating = getScoreRating(aiScore);

  // 별점 렌더링
  const renderStars = (count) => {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  };

  return (
    <div className="user-card" onClick={onClick}>
      {/* AI 점수 영역 (프로필 사진 대신) */}
      <div className="ai-score-section" style={{ '--score-color': rating.color }}>
        {aiScore ? (
          <>
            <div className="score-circle">
              <span className="score-number">{aiScore}</span>
              <span className="score-unit">점</span>
            </div>
            <div className="score-stars">{renderStars(rating.stars)}</div>
            <div className="score-label">{rating.label}</div>
            {celebrityLookalike?.name && (
              <div className="celebrity-lookalike">
                <span className="celebrity-icon">🌟</span>
                <span className="celebrity-name">{celebrityLookalike.name}</span>
                <span className="celebrity-match">닮음 {celebrityLookalike.confidence}%</span>
              </div>
            )}
          </>
        ) : (
          <div className="no-score">
            <span className="no-score-icon">📷</span>
            <span className="no-score-text">AI 평가 대기</span>
          </div>
        )}
      </div>

      <div className="card-content">
        <h3>{nickname}</h3>
        <div className="user-info">
          <span className="info-tag">{age}세</span>
          <span className="info-tag">{gender}</span>
          {mbti && <span className="info-tag mbti">{mbti}</span>}
        </div>
        {college && <p className="college">{college}</p>}
        <div className="likes-count">
          <span>❤️ {likesCount}개의 좋아요</span>
        </div>
      </div>

      <button
        className={`like-btn ${isLikedByMe ? 'liked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (userId) onLike(userId);
        }}
        disabled={isLikedByMe}
        title={isLikedByMe ? '좋아요 완료' : '좋아요'}
      >
        {isLikedByMe ? '❤️ 좋아요 완료' : '🤍 좋아요'}
      </button>
    </div>
  );
};

export default UserCard;
