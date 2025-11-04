// ===== AI 평가 서비스 =====
// 📌 현재 상태: 랜덤 점수 생성 (개발용)
// 🚀 실제 배포 시: OpenAI Vision API 연동 필요
//
// OpenAI API 사용 시 필요한 패키지:
// npm install openai
//
// 환경 변수 설정 필요:
// OPENAI_API_KEY=your_openai_api_key_here (server/.env)

// 랜덤 점수 생성 (개발용)
const generateRandomScore = () => {
  return Math.floor(Math.random() * 36) + 60; // 60~95점 (너무 낮거나 높지 않게)
};

/**
 * AI를 사용하여 프로필 사진 평가
 * @param {string} imageUrl - Cloudinary URL 또는 로컬 이미지 경로
 * @returns {Promise<number>} 1-100점 사이의 점수
 */
const evaluateWithAI = async (imageUrl) => {
  // ===== 실제 OpenAI Vision API 연동 코드 (주석 처리됨) =====
  // OpenAI API 사용을 원하면 아래 주석을 해제하고 위의 랜덤 점수 return을 제거하세요.

  /*
  const { OpenAI } = require('openai');

  // OpenAI 클라이언트 초기화
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview", // 또는 "gpt-4o" (최신 모델)
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "이 프로필 사진을 1-100점으로 평가해주세요. 평가 기준: 사진 품질, 선명도, 조명, 구도. 숫자만 답변해주세요."
          },
          {
            type: "image_url",
            image_url: { url: imageUrl }
          }
        ]
      }],
      max_tokens: 50
    });

    // 응답에서 점수 추출
    const content = response.choices[0].message.content;
    const score = parseInt(content.match(/\d+/)?.[0] || '70');

    // 점수 범위 제한 (1-100)
    return Math.max(1, Math.min(100, score));
  } catch (error) {
    console.error('AI 평가 오류:', error.message);
    // 오류 발생 시 기본 점수 반환
    return generateRandomScore();
  }
  */

  // ===== 개발 단계: 랜덤 점수 사용 =====
  console.log('⚠️  AI 평가: 랜덤 점수 사용 중 (실제 AI 평가 비활성화)');
  console.log(`📷 이미지 URL: ${imageUrl}`);

  return generateRandomScore();
};

module.exports = {
  generateRandomScore,
  evaluateWithAI
};
