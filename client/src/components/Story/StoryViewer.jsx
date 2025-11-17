import { useState, useEffect, useRef } from 'react';
import { storyAPI } from '../../services/api';
import './StoryViewer.css';

const StoryViewer = ({ stories, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);

  const STORY_DURATION = 5000; // 5초

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory) return;

    // 스토리 조회 기록
    storyAPI.viewStory(currentStory._id).catch(err =>
      console.error('스토리 조회 기록 실패:', err)
    );
  }, [currentStory]);

  // ESC 키로 닫기, 화살표 키로 이동
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        prevStory();
      } else if (e.key === 'ArrowRight') {
        nextStory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now() - pausedTimeRef.current;

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        nextStory();
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
  }, [currentIndex, isPaused]);

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      pausedTimeRef.current = 0;
    } else {
      onClose();
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

  const getImageUrl = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    return `${API_BASE}${url}`;
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000); // 초 단위

    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  if (!currentStory) return null;

  return (
    <div className="story-viewer-overlay">
      {/* 헤더 */}
      <div className="story-header">
        <div className="story-user-info">
          <img
            src={getImageUrl(currentStory.user.profileImage)}
            alt={currentStory.user.nickname}
            className="story-user-avatar"
            onError={(e) => (e.target.src = '/default-avatar.png')}
          />
          <div className="story-user-details">
            <span className="story-user-name">{currentStory.user.nickname}</span>
            <span className="story-time">{formatTime(currentStory.createdAt)}</span>
          </div>
        </div>
        <button className="story-close-btn" onClick={onClose}>
          ×
        </button>
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
          src={getImageUrl(currentStory.imageUrl)}
          alt="Story"
          className="story-image"
          onError={(e) => (e.target.src = '/default-avatar.png')}
        />
        {currentStory.caption && (
          <div className="story-caption">{currentStory.caption}</div>
        )}
      </div>

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
