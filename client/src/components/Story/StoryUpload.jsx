import { useState } from 'react';
import { storyAPI } from '../../services/api';
import './StoryUpload.css';

const StoryUpload = ({ onClose, onSuccess }) => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        alert('이미지는 5MB 이하만 업로드 가능합니다');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!imageFile) {
      alert('이미지를 선택해주세요');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      await storyAPI.uploadStory(formData);
      alert('스토리가 업로드되었습니다! 🎉');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('스토리 업로드 실패:', error);
      alert(error.response?.data?.error || '스토리 업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="story-upload-overlay" onClick={onClose}>
      <div className="story-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="story-upload-header">
          <h2>스토리 추가</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="story-upload-body">
          {!imagePreview ? (
            <label className="image-upload-label">
              <div className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <p>이미지 선택</p>
                <p className="upload-hint">최대 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
          ) : (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Preview" className="image-preview" />
              <button
                className="change-image-btn"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                이미지 변경
              </button>
            </div>
          )}

          <div className="caption-input-container">
            <textarea
              placeholder="캡션 입력 (선택사항)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              className="caption-input"
              rows={3}
            />
            <div className="char-count">{caption.length}/200</div>
          </div>
        </div>

        <div className="story-upload-footer">
          <button onClick={onClose} className="cancel-btn" disabled={uploading}>
            취소
          </button>
          <button
            onClick={handleUpload}
            className="upload-btn"
            disabled={!imageFile || uploading}
          >
            {uploading ? '업로드 중...' : '스토리 올리기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryUpload;
