import React from 'react';
import './UserCard.css';

const UserCard = ({ user, onLike, onClick }) => {
  const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  // Cloudinary URL 여부 확인 (https:// 로 시작하면 전체 URL)
  const getImageUrl = (profileImage) => {
    if (!profileImage) return '/default-avatar.png';
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      // Cloudinary URL: 전체 경로 그대로 사용
      return profileImage;
    }
    // 로컬 파일: API_BASE 붙이기
    return `${API_BASE}${profileImage}`;
  };

  // 안전한 데이터 접근
  const nickname = user?.nickname || '알 수 없음';
  const age = user?.age || 0;
  const gender = user?.gender === 'male' ? '남성' : '여성';
  const college = user?.college;
  const mbti = user?.mbti;
  const aiScore = user?.aiScore;
  const likesCount = user?.likesCount ?? 0;
  const isLikedByMe = user?.isLikedByMe || false;
  const userId = user?.id || user?._id;

  return (
    <div className="user-card" onClick={onClick}>
      <div className="card-image">
        <img
          src={getImageUrl(user?.profileImage)}
          alt={nickname}
          onError={(e) => e.target.src = '/default-avatar.png'}
        />
        {aiScore && (
          <div className="ai-badge">{aiScore}점</div>
        )}
      </div>

      <div className="card-content">
        <h3>{nickname}</h3>
        <p>{age}세 · {gender}</p>
        {college && <p>{college}</p>}
        {mbti && <p>MBTI: {mbti}</p>}
        <p>❤️ {likesCount}개</p>
      </div>

      <button
        className={`like-btn ${isLikedByMe ? 'liked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (userId) onLike(userId);
        }}
        disabled={isLikedByMe}
      >
        {isLikedByMe ? '좋아요 완료' : '❤️ 좋아요'}
      </button>
    </div>
  );
};

export default UserCard;
