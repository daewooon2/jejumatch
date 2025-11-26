const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const authMiddleware = require('../middlewares/auth');
const User = require('../models/User');
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

// Clarifai 닮은꼴 연예인 분석 함수
const analyzeCelebrity = async (imageBuffer) => {
  const PAT = process.env.CLARIFAI_PAT;

  if (!PAT) {
    console.log('⚠️ Clarifai PAT가 설정되지 않음, 닮은꼴 분석 스킵');
    return null;
  }

  try {
    // Clarifai의 공개 celebrity 모델 사용
    // user_id: clarifai, app_id: main, model_id: celebrity-face-recognition
    const response = await axios.post(
      'https://api.clarifai.com/v2/users/clarifai/apps/main/models/celebrity-face-recognition/outputs',
      {
        inputs: [{
          data: {
            image: {
              base64: imageBuffer.toString('base64')
            }
          }
        }]
      },
      {
        headers: {
          'Authorization': `Key ${PAT}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Clarifai API 응답:', JSON.stringify(response.data, null, 2));

    const outputs = response.data?.outputs?.[0];

    // celebrity 모델은 concepts에 직접 결과를 반환
    const concepts = outputs?.data?.concepts;

    if (concepts && concepts.length > 0) {
      // 가장 높은 확률의 연예인 (첫 번째 결과)
      const topMatch = concepts[0];
      // 신뢰도 조건 없이 항상 반환 (낮은 신뢰도도 표시)
      const confidence = Math.round(topMatch.value * 100);
      return {
        name: topMatch.name,
        confidence: confidence > 0 ? confidence : 1  // 최소 1%로 표시
      };
    }

    // regions에 있는 경우도 체크 (얼굴 감지 모델의 경우)
    const regions = outputs?.data?.regions;
    if (regions && regions.length > 0) {
      const regionConcepts = regions[0]?.data?.concepts;
      if (regionConcepts && regionConcepts.length > 0) {
        const topMatch = regionConcepts[0];
        const confidence = Math.round(topMatch.value * 100);
        return {
          name: topMatch.name,
          confidence: confidence > 0 ? confidence : 1
        };
      }
    }

    console.log('⚠️ 닮은꼴 연예인을 찾지 못함');
    return null;
  } catch (error) {
    console.error('❌ Clarifai API 에러:', error.response?.data || error.message);
    return null;
  }
};

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
  formData.append('return_attributes', 'gender,age,smiling,emotion,beauty');

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

// POST /api/face/analyze - 얼굴 분석 및 프로필에 점수 저장
router.post('/analyze', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    console.log('🔍 얼굴 분석 요청 받음, userId:', req.userId);

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

    // Face++ API와 Clarifai API 동시 호출
    const [faceData, celebrityData] = await Promise.all([
      analyzeFace(req.file.buffer),
      analyzeCelebrity(req.file.buffer)
    ]);

    console.log('✅ Face++ API 응답:', {
      faces_count: faceData.faces?.length || 0
    });
    console.log('✅ Clarifai 닮은꼴 결과:', celebrityData);

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

    // 사용자 프로필에 AI 점수와 닮은꼴 연예인 저장
    const updateData = { aiScore: beautyScore };
    if (celebrityData) {
      updateData.celebrityLookalike = celebrityData;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    );

    console.log('✅ AI 점수 저장 완료:', {
      userId: req.userId,
      aiScore: beautyScore,
      celebrityLookalike: celebrityData
    });

    // 응답 데이터 구성
    const result = {
      success: true,
      data: {
        // 저장된 AI 점수
        aiScore: beautyScore,
        saved: true,

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
          value: attributes.smiling?.value || 0,
          threshold: attributes.smiling?.threshold || 50
        },

        // 닮은꼴 연예인 (Clarifai)
        celebrityLookalike: celebrityData
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
