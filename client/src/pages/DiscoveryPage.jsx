import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI, likesAPI } from '../services/api';
import UserCard from '../components/UserCard';
import './DiscoveryPage.css';

const DiscoveryPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [filters, setFilters] = useState({
    sortBy: 'likes'
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchLikesCount();
  }, [filters]);

  const fetchLikesCount = async () => {
    try {
      const res = await likesAPI.getLikesCount();
      setLikesCount(res.data.count);
    } catch (error) {
      console.error('좋아요 수 로드 실패:', error);
    }
  };
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getUsers(filters);
      setUsers(res.data.users);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
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
          ? { ...user, isLikedByMe: true, likesCount: (user.likesCount || 0) + 1 }
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
    <div className="discovery-page">
      <header className="discovery-header">
        <h1>사용자 탐색</h1>
        <div className="header-buttons">
          <button onClick={() => navigate('/likes-received')} className="likes-received-btn">
            💖 받은 좋아요
            {likesCount > 0 && <span className="notification-badge">{likesCount}</span>}
          </button>
          <button onClick={() => navigate('/matches')} className="matches-btn">
            매칭 목록
          </button>
          <button onClick={() => navigate('/my-profile')} className="profile-btn">
            내 프로필
          </button>
        </div>
      </header>
      
      <div className="filters">
        <select 
          value={filters.sortBy} 
          onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
        >
          <option value="likes">인기순</option>
          <option value="aiScore">AI 점수순</option>
          <option value="recent">최신순</option>
        </select>
      </div>
      
      <div className="users-grid">
        {users.length === 0 ? (
          <p className="no-users">조건에 맞는 사용자가 없습니다.</p>
        ) : (
          users.map(user => (
            <UserCard 
              key={user.id || user._id}
              user={user}
              onLike={handleLike}
              onClick={() => navigate(`/profile/${user.id || user._id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DiscoveryPage;
