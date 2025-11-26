import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { faceAPI } from '../services/api';
import './FaceAnalysisPage.css';

const FaceAnalysisPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 파일 유효성 검사
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return 'JPG, PNG 형식의 이미지만 업로드 가능합니다.';
    }
    if (file.size > maxSize) {
      return '이미지 크기가 2MB를 초과합니다.';
    }
    return null;
  };

  // 파일 선택 처리
  const handleFileSelect = useCallback((file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedImage(file);
    setError(null);
    setResult(null);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 파일 입력 클릭
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 입력 변경
  const handleInputChange = (e) => {
    if (e.target.files?.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // 얼굴 분석 실행
  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('이미지를 선택해주세요.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await faceAPI.analyze(formData);

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError(response.data.error || '분석 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('얼굴 분석 에러:', err);
      setError(err.response?.data?.error || '서버 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  // 다시 분석하기
  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  // 별점 렌더링
  const renderStars = (count) => {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  };

  // 프로그레스 바 색상
  const getProgressColor = (value, inverse = false) => {
    const adjustedValue = inverse ? 100 - value : value;
    if (adjustedValue >= 70) return '#4ade80';
    if (adjustedValue >= 40) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="face-analysis-page">
      <div className="face-analysis-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 뒤로
        </button>
        <h1>AI 얼굴 분석</h1>
        <p className="subtitle">Face++ AI가 당신의 매력을 분석해드립니다</p>
      </div>

      <div className="face-analysis-content">
        {/* 이미지 업로드 영역 */}
        {!result && (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''} ${imagePreview ? 'has-image' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!imagePreview ? handleClick : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleInputChange}
              hidden
            />

            {imagePreview ? (
              <div className="preview-container">
                <img src={imagePreview} alt="미리보기" className="preview-image" />
                <button className="change-image-btn" onClick={handleClick}>
                  다른 이미지 선택
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>
                <p className="upload-text">
                  이미지를 드래그하거나<br />
                  <span className="upload-link">클릭하여 선택</span>
                </p>
                <p className="upload-hint">
                  JPG, PNG • 최대 2MB • 48x48 ~ 4096x4096
                </p>
              </div>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* 분석 버튼 */}
        {imagePreview && !result && (
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className="spinner"></span>
                AI 분석 중...
              </>
            ) : (
              '✨ 얼굴 분석 시작'
            )}
          </button>
        )}

        {/* 분석 결과 */}
        {result && (
          <div className="result-container">
            {/* 이미지와 얼굴 박스 */}
            <div className="result-image-section">
              <div className="result-image-wrapper">
                <img src={imagePreview} alt="분석 이미지" className="result-image" />
                {result.faceRectangle && (
                  <div
                    className="face-box"
                    style={{
                      left: `${(result.faceRectangle.left / 100) * 100}%`,
                      top: `${(result.faceRectangle.top / 100) * 100}%`,
                      width: `${result.faceRectangle.width}px`,
                      height: `${result.faceRectangle.height}px`
                    }}
                  />
                )}
              </div>
            </div>

            {/* 미용 점수 카드 */}
            <div className="result-card beauty-card">
              <h3>💖 매력 점수</h3>
              <div className="beauty-score">
                <span className="score-number">{result.beauty.score}</span>
                <span className="score-unit">점</span>
              </div>
              <div className="stars">{renderStars(result.beauty.rating.stars)}</div>
              <p className="rating-label">{result.beauty.rating.label}</p>
              <div className="beauty-details">
                <div className="beauty-detail">
                  <span>남성 평가</span>
                  <span>{result.beauty.maleScore}점</span>
                </div>
                <div className="beauty-detail">
                  <span>여성 평가</span>
                  <span>{result.beauty.femaleScore}점</span>
                </div>
              </div>
            </div>

            {/* 기본 정보 카드 */}
            <div className="result-card info-card">
              <h3>👤 기본 정보</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">추정 나이</span>
                  <span className="info-value">{result.age}세</span>
                </div>
                <div className="info-item">
                  <span className="info-label">성별</span>
                  <span className="info-value">{result.gender.ko}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">미소 지수</span>
                  <span className="info-value">{Math.round(result.smile.value)}%</span>
                </div>
                <div className="info-item">
                  <span className="info-label">얼굴 품질</span>
                  <span className="info-value">{Math.round(result.faceQuality.value)}%</span>
                </div>
              </div>
            </div>

            {/* 감정 분석 카드 */}
            <div className="result-card emotion-card">
              <h3>😊 감정 분석</h3>
              <div className="dominant-emotion">
                <span className="emotion-emoji">{result.emotion.dominant.emoji}</span>
                <span className="emotion-name">{result.emotion.dominant.ko}</span>
                <span className="emotion-value">{Math.round(result.emotion.value)}%</span>
              </div>
              <div className="emotion-bars">
                {result.emotion.all.slice(0, 4).map((emotion) => (
                  <div key={emotion.name} className="emotion-bar-item">
                    <span className="emotion-bar-emoji">{emotion.emoji}</span>
                    <span className="emotion-bar-name">{emotion.name}</span>
                    <div className="emotion-bar-track">
                      <div
                        className="emotion-bar-fill"
                        style={{ width: `${emotion.value}%` }}
                      />
                    </div>
                    <span className="emotion-bar-value">{Math.round(emotion.value)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 피부 상태 카드 */}
            <div className="result-card skin-card">
              <h3>✨ 피부 상태</h3>
              <div className="skin-grid">
                {result.skin.map((item) => (
                  <div key={item.name} className={`skin-item ${item.status}`}>
                    <span className="skin-name">{item.name}</span>
                    <div className="skin-progress">
                      <div
                        className="skin-progress-fill"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: getProgressColor(
                            item.value,
                            item.name !== '건강도'
                          )
                        }}
                      />
                    </div>
                    <span className="skin-value">{Math.round(item.value)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 다시 분석 버튼 */}
            <button className="reset-btn" onClick={handleReset}>
              🔄 다른 사진으로 분석하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceAnalysisPage;
