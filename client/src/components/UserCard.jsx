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

  return (
    <div className="user-card" onClick={onClick}>
      <div className="card-image">
        <img
          src={getImageUrl(user.profileImage)}
          alt={user.nickname}
          onError={(e) => e.target.src = '/default-avatar.png'}
        />
        {user.aiScore && (
          <div className="ai-badge">{user.aiScore}점</div>
        )}
      </div>
      
      <div className="card-content">
        <h3>{user.nickname}</h3>
        <p>{user.age}세 · {user.gender === 'male' ? '남성' : '여성'}</p>
        {user.college && <p>{user.college}</p>}
        {user.mbti && <p>MBTI: {user.mbti}</p>}
        <p>❤️ {user.likesCount || 0}개</p>
      </div>
      
      <button 
        className={`like-btn ${user.isLikedByMe ? 'liked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onLike(user.id || user._id);
        }}
        disabled={user.isLikedByMe}
      >
        {user.isLikedByMe ? '좋아요 완료' : '❤️ 좋아요'}
      </button>
    </div>
  );
};

export default UserCard;
