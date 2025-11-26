const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const router = express.Router();

// 메모리 저장소 사용 (Face++ API로 바로 전송)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('JPG, PNG 형식의 이미지만 업로드 가능합니다.'), false);
    }
  }
});

// Face++ API 호출 함수
const analyzeFace = async (imageBuffer) => {
  const apiKey = process.env.FACE_PLUS_PLUS_API_KEY;
  const apiSecret = process.env.FACE_PLUS_PLUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Face++ API 키가 설정되지 않았습니다.');
  }

  const formData = new FormData();
  formData.append('api_key', apiKey);
  formData.append('api_secret', apiSecret);
  formData.append('image_base64', imageBuffer.toString('base64'));
  formData.append('return_attributes', 'gender,age,smile,emotion,beauty,skinstatus,facequality');

  const response = await axios.post(
    'https://api-us.faceplusplus.com/facepp/v3/detect',
    formData,
    {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30초 타임아웃
    }
  );

  return response.data;
};

// 미용 점수 등급 계산
const getBeautyRating = (score) => {
  if (score >= 90) return { stars: 5, label: '매우 매력적' };
  if (score >= 80) return { stars: 4, label: '매력적' };
  if (score >= 70) return { stars: 3, label: '평균 이상' };
  if (score >= 60) return { stars: 2, label: '평균' };
  return { stars: 1, label: '개선 필요' };
};

// 감정 분석 결과 변환
const translateEmotion = (emotions) => {
  const emotionMap = {
    anger: { ko: '분노', emoji: '😠' },
    disgust: { ko: '혐오', emoji: '🤢' },
    fear: { ko: '공포', emoji: '😨' },
    happiness: { ko: '행복', emoji: '😊' },
    neutral: { ko: '무표정', emoji: '😐' },
    sadness: { ko: '슬픔', emoji: '😢' },
    surprise: { ko: '놀람', emoji: '😲' }
  };

  // 가장 높은 감정 찾기
  let maxEmotion = 'neutral';
  let maxValue = 0;

  for (const [emotion, value] of Object.entries(emotions)) {
    if (value > maxValue) {
      maxValue = value;
      maxEmotion = emotion;
    }
  }

  return {
    dominant: emotionMap[maxEmotion] || { ko: maxEmotion, emoji: '😐' },
    value: maxValue,
    all: Object.entries(emotions).map(([key, value]) => ({
      name: emotionMap[key]?.ko || key,
      emoji: emotionMap[key]?.emoji || '😐',
      value: value
    })).sort((a, b) => b.value - a.value)
  };
};

// 피부 상태 분석 변환
const analyzeSkinStatus = (skinstatus) => {
  const skinLabels = {
    health: '건강도',
    stain: '잡티',
    acne: '여드름',
    dark_circle: '다크서클'
  };

  return Object.entries(skinstatus).map(([key, value]) => ({
    name: skinLabels[key] || key,
    value: value,
    // health는 높을수록 좋고, 나머지는 낮을수록 좋음
    status: key === 'health'
      ? (value >= 70 ? 'good' : value >= 40 ? 'normal' : 'bad')
      : (value <= 30 ? 'good' : value <= 60 ? 'normal' : 'bad')
  }));
};

// POST /api/face/analyze - 얼굴 분석
router.post('/analyze', upload.single('image'), async (req, res, next) => {
  try {
    console.log('🔍 얼굴 분석 요청 받음');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '이미지를 업로드해주세요.'
      });
    }

    console.log('📷 이미지 정보:', {
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`
    });

    // Face++ API 호출
    const faceData = await analyzeFace(req.file.buffer);

    console.log('✅ Face++ API 응답:', {
      faces_count: faceData.faces?.length || 0
    });

    // 얼굴이 감지되지 않은 경우
    if (!faceData.faces || faceData.faces.length === 0) {
      return res.status(400).json({
        success: false,
        error: '얼굴이 감지되지 않았습니다. 다른 사진을 시도해주세요.'
      });
    }

    // 첫 번째 얼굴 데이터 처리
    const face = faceData.faces[0];
    const attributes = face.attributes;

    // 미용 점수 계산 (male_score와 female_score 평균)
    const beautyScore = Math.round(
      (attributes.beauty.male_score + attributes.beauty.female_score) / 2
    );
    const beautyRating = getBeautyRating(beautyScore);

    // 감정 분석
    const emotionAnalysis = translateEmotion(attributes.emotion);

    // 피부 상태 분석
    const skinAnalysis = analyzeSkinStatus(attributes.skinstatus);

    // 응답 데이터 구성
    const result = {
      success: true,
      data: {
        // 얼굴 위치 (이미지 오버레이용)
        faceRectangle: face.face_rectangle,

        // 미용 점수
        beauty: {
          score: beautyScore,
          maleScore: Math.round(attributes.beauty.male_score),
          femaleScore: Math.round(attributes.beauty.female_score),
          rating: beautyRating
        },

        // 나이 & 성별
        age: attributes.age.value,
        gender: {
          value: attributes.gender.value,
          ko: attributes.gender.value === 'Male' ? '남성' : '여성'
        },

        // 감정 분석
        emotion: emotionAnalysis,

        // 미소 정도
        smile: {
          value: attributes.smile.value,
          threshold: attributes.smile.threshold
        },

        // 피부 상태
        skin: skinAnalysis,

        // 얼굴 품질
        faceQuality: {
          value: attributes.facequality.value,
          threshold: attributes.facequality.threshold
        },

        // 이미지 정보
        imageInfo: {
          width: faceData.image_id ? undefined : faceData.image?.width,
          height: faceData.image_id ? undefined : faceData.image?.height
        }
      }
    };

    res.json(result);

  } catch (error) {
    console.error('❌ 얼굴 분석 에러:', error.response?.data || error.message);

    // Face++ API 에러 처리
    if (error.response?.data?.error_message) {
      return res.status(400).json({
        success: false,
        error: `Face++ API 오류: ${error.response.data.error_message}`
      });
    }

    // 파일 크기/형식 에러
    if (error.message.includes('형식')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    next(error);
  }
});

// Multer 에러 핸들러
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '이미지 크기가 2MB를 초과합니다.'
      });
    }
  }
  next(error);
});

module.exports = router;
