import { useState, useEffect, useRef } from 'react';
import { storyAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import './StoryViewer.css';

const StoryViewer = ({ stories = [], initialIndex = 0, onClose, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isCommentFocused, setIsCommentFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  // 각 스토리별 댓글을 별도로 관리
  const [commentsMap, setCommentsMap] = useState({});

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const isMountedRef = useRef(true);
  const { user } = useAuth();

  const STORY_DURATION = 5000; // 5초

  // 안전한 currentStory 접근
  const currentStory = stories && stories[currentIndex] ? stories[currentIndex] : null;

  // 컴포넌트 언마운트 추적
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentStory) return;

    // 스토리 조회 기록
    storyAPI.viewStory(currentStory._id).catch(err =>
      console.error('스토리 조회 기록 실패:', err)
    );

    // 좋아요 상태 초기화
    const likes = currentStory.likes || [];
    const isLiked = user?._id ? likes.some(id =>
      id === user._id || id?.toString() === user._id
    ) : false;

    setLiked(isLiked);
    setLikeCount(likes.length);

    // 댓글 초기화 - commentsMap에 없으면 currentStory의 comments 사용
    if (!commentsMap[currentStory._id]) {
      setCommentsMap(prev => ({
        ...prev,
        [currentStory._id]: currentStory.comments || []
      }));
    }

    setShowComments(false);
    setCommentText('');
  }, [currentStory, user]);

  // ESC 키로 닫기, 화살표 키로 이동
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isMountedRef.current) return;

      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
          setProgress(0);
          pausedTimeRef.current = 0;
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setProgress(0);
          pausedTimeRef.current = 0;
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose, stories.length]);

  // 댓글 섹션이 열리거나 댓글 입력에 포커스가 있을 때 일시정지
  useEffect(() => {
    if (showComments || isCommentFocused) {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  }, [showComments, isCommentFocused]);

  useEffect(() => {
    if (isPaused || !currentStory) return;

    startTimeRef.current = Date.now() - pausedTimeRef.current;

    const updateProgress = () => {
      if (!isMountedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        // 다음 스토리로 이동
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setProgress(0);
          pausedTimeRef.current = 0;
        } else {
          onClose?.();
        }
      } else {
        timerRef.current = requestAnimationFrame(updateProgress);
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [currentIndex, isPaused, currentStory, stories.length, onClose]);

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      pausedTimeRef.current = 0;
    } else {
      onClose?.();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      pausedTimeRef.current = 0;
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    pausedTimeRef.current = Date.now() - startTimeRef.current;
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleLike = async () => {
    if (!currentStory?._id || loading) return;

    setLoading(true);
    try {
      if (liked) {
        await storyAPI.unlikeStory(currentStory._id);
        if (isMountedRef.current) {
          setLiked(false);
          setLikeCount(prev => Math.max(0, prev - 1));
        }
      } else {
        await storyAPI.likeStory(currentStory._id);
        if (isMountedRef.current) {
          setLiked(true);
          setLikeCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleAddComment = async () => {
    if (!commentText?.trim() || !currentStory?._id || loading) return;

    setLoading(true);
    try {
      const res = await storyAPI.addComment(currentStory._id, commentText.trim());
      if (isMountedRef.current && res?.data?.comment) {
        const newComment = res.data.comment;
        // commentsMap에 댓글 추가
        setCommentsMap(prev => ({
          ...prev,
          [currentStory._id]: [...(prev[currentStory._id] || []), newComment]
        }));
        setCommentText('');
        setIsCommentFocused(false);
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      if (isMountedRef.current) {
        alert(error.response?.data?.error || '댓글 작성에 실패했습니다');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId || !currentStory?._id || loading) return;
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await storyAPI.deleteComment(currentStory._id, commentId);
      if (isMountedRef.current) {
        // commentsMap에서 댓글 삭제
        setCommentsMap(prev => ({
          ...prev,
          [currentStory._id]: (prev[currentStory._id] || []).filter(c => c?._id !== commentId)
        }));
      }
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      if (isMountedRef.current) {
        alert(error.response?.data?.error || '댓글 삭제에 실패했습니다');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory?._id || loading) return;
    if (!window.confirm('스토리를 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await storyAPI.deleteStory(currentStory._id);
      if (isMountedRef.current) {
        alert('스토리가 삭제되었습니다');
        onDelete?.(currentStory._id);
        onClose?.();
      }
    } catch (error) {
      console.error('스토리 삭제 실패:', error);
      if (isMountedRef.current) {
        alert(error.response?.data?.error || '스토리 삭제에 실패했습니다');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getImageUrl = (url) => {
    if (!url) return '/default-avatar.png';

    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
      return `${API_BASE}${url}`;
    } catch (error) {
      console.error('이미지 URL 생성 실패:', error);
      return '/default-avatar.png';
    }
  };

  const formatTime = (date) => {
    if (!date) return '';

    try {
      const now = new Date();
      const targetDate = new Date(date);
      const diff = Math.floor((now - targetDate) / 1000);

      if (isNaN(diff) || diff < 0) return '방금 전';
      if (diff < 60) return `${diff}초 전`;
      if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
      return `${Math.floor(diff / 86400)}일 전`;
    } catch (error) {
      console.error('시간 포맷 실패:', error);
      return '';
    }
  };

  // currentStory가 없으면 빈 화면 렌더링
  if (!stories || stories.length === 0) {
    return (
      <div className="story-viewer-overlay">
        <div className="story-error">
          <p>스토리를 불러올 수 없습니다</p>
          <button onClick={() => onClose?.()}>닫기</button>
        </div>
      </div>
    );
  }

  if (!currentStory) {
    return null;
  }

  // 안전한 데이터 접근
  const storyUser = currentStory.user || {};
  const storyImageUrl = currentStory.imageUrl;
  const storyCaption = currentStory.caption;

  // 현재 스토리의 댓글 가져오기
  const currentComments = commentsMap[currentStory._id] || [];

  return (
    <div className="story-viewer-overlay">
      {/* 헤더 */}
      <div className="story-header">
        <div className="story-user-info">
          <img
            src={getImageUrl(storyUser.profileImage)}
            alt={storyUser.nickname || '사용자'}
            className="story-user-avatar"
            onError={(e) => (e.target.src = '/default-avatar.png')}
          />
          <div className="story-user-details">
            <span className="story-user-name">{storyUser.nickname || '알 수 없음'}</span>
            <span className="story-time">{formatTime(currentStory.createdAt)}</span>
          </div>
        </div>
        <div className="story-header-actions">
          {storyUser._id === user?._id && (
            <button
              className="story-delete-btn"
              onClick={handleDeleteStory}
              title="스토리 삭제"
              disabled={loading}
            >
              🗑️
            </button>
          )}
          <button className="story-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="story-progress-bars">
        {stories.map((_, index) => (
          <div key={index} className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: index === currentIndex
                  ? `${progress}%`
                  : index < currentIndex
                  ? '100%'
                  : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* 스토리 이미지 */}
      <div className="story-content">
        <img
          src={getImageUrl(storyImageUrl)}
          alt="Story"
          className="story-image"
          onError={(e) => (e.target.src = '/default-avatar.png')}
        />
        {storyCaption && (
          <div className="story-caption">{storyCaption}</div>
        )}

        {/* 좋아요 & 댓글 버튼 */}
        <div className="story-actions">
          <button
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={loading}
          >
            {liked ? '❤️' : '🤍'} {likeCount > 0 && likeCount}
          </button>
          <button
            className="comment-btn"
            onClick={() => setShowComments(!showComments)}
            disabled={loading}
          >
            💬 {currentComments.length > 0 && currentComments.length}
          </button>
        </div>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="story-comments-section">
          <div className="comments-header">
            <h3>댓글 {currentComments.length}</h3>
            <button onClick={() => setShowComments(false)}>×</button>
          </div>

          <div className="comments-list">
            {currentComments.length === 0 ? (
              <p className="no-comments">첫 댓글을 남겨보세요!</p>
            ) : (
              currentComments.map((comment) => {
                if (!comment || !comment._id) return null;

                const commentUser = comment.user || {
                  nickname: '알 수 없음',
                  profileImage: null,
                  _id: null
                };

                return (
                  <div key={comment._id} className="comment-item">
                    <img
                      src={getImageUrl(commentUser.profileImage)}
                      alt={commentUser.nickname}
                      className="comment-avatar"
                      onError={(e) => (e.target.src = '/default-avatar.png')}
                    />
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{commentUser.nickname}</span>
                        <span className="comment-time">{formatTime(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.text || ''}</p>
                    </div>
                    {(commentUser._id === user?._id || storyUser._id === user?._id) && (
                      <button
                        className="delete-comment-btn"
                        onClick={() => handleDeleteComment(comment._id)}
                        title="댓글 삭제"
                        disabled={loading}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="comment-input-container">
            <input
              type="text"
              placeholder="댓글을 입력하세요..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value?.slice(0, 500))}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleAddComment()}
              onFocus={() => setIsCommentFocused(true)}
              onBlur={() => setIsCommentFocused(false)}
              maxLength={500}
              disabled={loading}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText?.trim() || loading}
            >
              {loading ? '...' : '전송'}
            </button>
          </div>
        </div>
      )}

      {/* 네비게이션 (좌우 클릭 + 화살표 버튼) */}
      <div className="story-navigation">
        <div
          className="nav-left"
          onClick={prevStory}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
          onMouseDown={handlePause}
          onMouseUp={handleResume}
          onMouseLeave={handleResume}
        >
          {currentIndex > 0 && (
            <button className="arrow-btn arrow-left">
              ←
            </button>
          )}
        </div>
        <div
          className="nav-right"
          onClick={nextStory}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
          onMouseDown={handlePause}
          onMouseUp={handleResume}
          onMouseLeave={handleResume}
        >
          {currentIndex < stories.length - 1 && (
            <button className="arrow-btn arrow-right">
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;