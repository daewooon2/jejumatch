import './StoryRing.css';

const StoryRing = ({ user, hasStory, hasUnviewed, onClick }) => {
  const getImageUrl = (profileImage) => {
    if (!profileImage) return '/default-avatar.png';
    if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
      return profileImage;
    }
    const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    return `${API_BASE}${profileImage}`;
  };

  return (
    <div
      className={`story-ring-container ${hasStory ? 'has-story' : ''} ${hasUnviewed ? 'unviewed' : ''}`}
      onClick={onClick}
      style={{ cursor: hasStory ? 'pointer' : 'default' }}
    >
      <div className="story-ring">
        <img
          src={getImageUrl(user.profileImage)}
          alt={user.nickname}
          className="story-profile-image"
          onError={(e) => (e.target.src = '/default-avatar.png')}
        />
      </div>
      {hasStory && (
        <div className="story-plus-icon">+</div>
      )}
    </div>
  );
};

export default StoryRing;
