# JejuMatch - 제주대학교 학생 매칭 서비스

## 프로젝트 발표 자료

---

## 1. 프로젝트 소개

### JejuMatch란?
- **제주대학교 학생들을 위한 소셜 매칭 웹 애플리케이션**
- AI 기반 얼굴 분석과 실시간 채팅 기능을 결합한 대학생 전용 서비스
- 인스타그램 스타일의 스토리 기능으로 일상 공유

### 개발 목표
- 제주도 지역 특성상 제한된 대학생 네트워크 확장
- AI 기술을 활용한 차별화된 매칭 서비스 제공
- 실시간 소통 기능으로 사용자 경험 향상

---

## 2. 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 컴포넌트 기반 프론트엔드 |
| React Router | 클라이언트 사이드 라우팅 |
| Socket.io Client | 실시간 양방향 통신 |
| Axios | HTTP API 통신 |
| CSS3 | 반응형 디자인 및 애니메이션 |

### Backend
| 기술 | 용도 |
|------|------|
| Node.js | 서버 런타임 환경 |
| Express.js | REST API 서버 프레임워크 |
| MongoDB + Mongoose | NoSQL 데이터베이스 |
| Socket.io | 실시간 채팅 및 알림 |
| JWT | 토큰 기반 인증 |
| Multer | 파일 업로드 처리 |

### 외부 API
| API | 용도 |
|-----|------|
| Face++ API | 얼굴 분석 (나이, 성별, 감정, 매력도) |
| Clarifai API | 닮은꼴 연예인 분석 |
| Cloudinary | 이미지 클라우드 저장소 |

### 배포
| 서비스 | 용도 |
|--------|------|
| Vercel | 프론트엔드 호스팅 |
| Render | 백엔드 서버 호스팅 |
| MongoDB Atlas | 클라우드 데이터베이스 |

---

## 3. 주요 기능

### 3.1 회원가입 및 로그인
- 이메일 기반 회원가입
- JWT 토큰 인증 방식
- 비밀번호 bcrypt 해싱 암호화

### 3.2 사용자 탐색 (Discovery)
- 이성 사용자 탐색 및 필터링
- MBTI, 지역, 취미 기반 필터
- AI 점수순, 좋아요순 정렬
- 좋아요 기능 (상호 좋아요 시 매칭)

### 3.3 AI 얼굴 분석
```
┌─────────────────────────────────────┐
│         사용자 사진 업로드            │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│     Face++ API        Clarifai API   │
│   (매력도 분석)      (닮은꼴 분석)     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  • 매력 점수 (1-100점)                │
│  • 추정 나이, 성별                    │
│  • 감정 분석 (행복, 슬픔 등)          │
│  • 닮은꼴 연예인                      │
└──────────────────────────────────────┘
```

### 3.4 실시간 채팅
- Socket.io 기반 실시간 메시지 전송
- 매칭된 사용자 간 1:1 채팅
- 메시지 읽음 상태 표시
- 타이핑 인디케이터

### 3.5 스토리 기능
- 24시간 후 자동 삭제되는 스토리
- 이미지 + 캡션 업로드
- 좋아요 및 댓글 기능
- 실시간 상호작용 (Socket.io)

---

## 4. 시스템 아키텍처

```
┌─────────────┐     HTTPS      ┌─────────────┐
│   Client    │ ◄────────────► │   Vercel    │
│  (Browser)  │                │  (React)    │
└──────┬──────┘                └─────────────┘
       │
       │ REST API / WebSocket
       ▼
┌─────────────┐                ┌─────────────┐
│   Render    │ ◄────────────► │  MongoDB    │
│  (Express)  │                │   Atlas     │
└──────┬──────┘                └─────────────┘
       │
       │ External APIs
       ▼
┌─────────────────────────────────────────────┐
│  Face++ API  │  Clarifai API  │  Cloudinary │
└─────────────────────────────────────────────┘
```

---

## 5. 데이터베이스 설계

### User Schema
```javascript
{
  email: String,          // 이메일 (unique)
  password: String,       // 해싱된 비밀번호
  nickname: String,       // 닉네임 (unique)
  age: Number,            // 나이
  gender: 'male'|'female',// 성별
  college: String,        // 단과대학
  major: String,          // 전공
  mbti: String,           // MBTI
  hobbies: [String],      // 취미
  region: String,         // 지역
  profileImage: String,   // 프로필 이미지 URL
  aiScore: Number,        // AI 매력 점수
  celebrityLookalike: {   // 닮은꼴 연예인
    name: String,
    confidence: Number
  },
  likedUsers: [ObjectId], // 내가 좋아요한 사용자
  likedByUsers: [ObjectId]// 나를 좋아요한 사용자
}
```

### Match Schema
```javascript
{
  users: [ObjectId, ObjectId], // 매칭된 두 사용자
  createdAt: Date              // 매칭 시간
}
```

### Message Schema
```javascript
{
  match: ObjectId,    // 매칭 ID
  sender: ObjectId,   // 발신자
  content: String,    // 메시지 내용
  read: Boolean,      // 읽음 상태
  createdAt: Date     // 전송 시간
}
```

### Story Schema
```javascript
{
  user: ObjectId,        // 작성자
  imageUrl: String,      // 이미지 URL
  caption: String,       // 캡션
  likes: [ObjectId],     // 좋아요한 사용자들
  comments: [{           // 댓글
    user: ObjectId,
    text: String,
    createdAt: Date
  }],
  expiresAt: Date        // 만료 시간 (24시간)
}
```

---

## 6. API 설계

### 인증 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/auth/me | 내 정보 조회 |

### 사용자 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/users | 사용자 목록 (필터/정렬) |
| GET | /api/users/:id | 사용자 상세 |
| POST | /api/users/:id/like | 좋아요 |

### 매칭/채팅 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/matches | 내 매칭 목록 |
| GET | /api/messages/:matchId | 메시지 조회 |
| POST | /api/messages | 메시지 전송 |

### AI 분석 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/face/analyze | 얼굴 분석 |

### 스토리 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/stories | 스토리 목록 |
| POST | /api/stories | 스토리 업로드 |
| POST | /api/stories/:id/like | 좋아요 |
| POST | /api/stories/:id/comments | 댓글 작성 |

---

## 7. 핵심 구현 코드

### 7.1 JWT 인증 미들웨어
```javascript
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  req.user = { id: decoded.userId };

  next();
};
```

### 7.2 Socket.io 실시간 채팅
```javascript
// 서버 측
io.on('connection', (socket) => {
  socket.on('join-match', (matchId) => {
    socket.join(`match-${matchId}`);
  });

  socket.on('send-message', (data) => {
    io.to(`match-${data.matchId}`).emit('new-message', data);
  });
});
```

### 7.3 AI 얼굴 분석 (Face++ + Clarifai 병렬 호출)
```javascript
const [faceData, celebrityData] = await Promise.all([
  analyzeFace(imageBuffer),      // Face++ API
  analyzeCelebrity(imageBuffer)  // Clarifai API
]);

// 결과를 DB에 저장
await User.findByIdAndUpdate(userId, {
  aiScore: beautyScore,
  celebrityLookalike: celebrityData
});
```

### 7.4 좋아요 → 매칭 로직
```javascript
// 좋아요 처리
currentUser.likedUsers.push(targetUserId);
targetUser.likedByUsers.push(currentUserId);

// 상호 좋아요 확인 → 매칭 생성
if (targetUser.likedUsers.includes(currentUserId)) {
  await Match.create({
    users: [currentUserId, targetUserId]
  });
  return { matched: true };
}
```

---

## 8. 프로젝트 구조

```
jejumatch/
├── client/                    # 프론트엔드 (React)
│   ├── src/
│   │   ├── components/        # 재사용 컴포넌트
│   │   │   ├── Story/         # 스토리 관련
│   │   │   └── UserCard.jsx   # 사용자 카드
│   │   ├── pages/             # 페이지 컴포넌트
│   │   │   ├── DiscoveryPage.jsx
│   │   │   ├── MatchesPage.jsx
│   │   │   ├── ChatRoomPage.jsx
│   │   │   └── FaceAnalysisPage.jsx
│   │   ├── hooks/             # 커스텀 훅
│   │   │   ├── useAuth.js
│   │   │   └── useSocket.js
│   │   └── services/          # API 통신
│   │       └── api.js
│   └── package.json
│
├── server/                    # 백엔드 (Express)
│   ├── src/
│   │   ├── routes/            # API 라우트
│   │   │   ├── auth.routes.js
│   │   │   ├── users.routes.js
│   │   │   ├── face.routes.js
│   │   │   └── story.routes.js
│   │   ├── models/            # MongoDB 모델
│   │   │   ├── User.js
│   │   │   ├── Match.js
│   │   │   └── Story.js
│   │   ├── middlewares/       # 미들웨어
│   │   │   └── auth.js
│   │   └── sockets/           # Socket.io 핸들러
│   │       └── chatHandler.js
│   └── package.json
│
└── CLAUDE.md                  # 프로젝트 문서
```

---

## 9. 시연 시나리오

### 시나리오 1: 회원가입 → AI 분석
1. 회원가입 (이메일, 비밀번호, 프로필 정보 입력)
2. AI 얼굴 분석 페이지 이동
3. 사진 업로드 → 분석 결과 확인
   - 매력 점수: 85점
   - 닮은꼴 연예인: 박보검 (32%)

### 시나리오 2: 사용자 탐색 → 매칭
1. 사용자 탐색 페이지에서 이성 탐색
2. 마음에 드는 사용자에게 좋아요
3. 상대방도 좋아요 → 매칭 성립!
4. 매칭 목록에서 확인

### 시나리오 3: 실시간 채팅
1. 매칭된 사용자와 채팅방 입장
2. 실시간 메시지 주고받기
3. 타이핑 인디케이터 확인

### 시나리오 4: 스토리 기능
1. 스토리 업로드 (사진 + 캡션)
2. 다른 사용자 스토리 보기
3. 좋아요 및 댓글 남기기

---

## 10. 개발 과정에서의 문제 해결

### 문제 1: Face++ API 무료 플랜 제한
- **문제**: skinstatus, facequality 속성 사용 불가
- **해결**: 무료로 사용 가능한 속성만 사용 (beauty, age, gender, emotion, smiling)

### 문제 2: userId undefined 버그
- **문제**: AI 분석 결과가 DB에 저장되지 않음
- **원인**: `req.userId` 대신 `req.user.id` 사용해야 함
- **해결**: auth 미들웨어 확인 후 올바른 속성명 사용

### 문제 3: 스토리 좋아요 버튼 동작 안함
- **문제**: 좋아요 후 버튼이 비활성화됨
- **원인**: 단일 `loading` 상태가 모든 버튼에 영향
- **해결**: 낙관적 업데이트 + 로딩 상태 분리

### 문제 4: CORS 에러
- **문제**: 프론트엔드-백엔드 통신 차단
- **해결**: Express CORS 미들웨어 설정
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
```

---

## 11. 향후 개선 사항

1. **푸시 알림**: 새 메시지, 매칭 알림
2. **신고 기능**: 부적절한 사용자 신고
3. **프로필 인증**: 학생증 인증 시스템
4. **추천 알고리즘**: AI 기반 사용자 추천
5. **다크 모드**: UI 테마 지원

---

## 12. 결론

### 프로젝트 성과
- React + Node.js 풀스택 웹 애플리케이션 구현
- 외부 AI API (Face++, Clarifai) 연동
- Socket.io 실시간 통신 구현
- 클라우드 서비스 (Vercel, Render, MongoDB Atlas) 활용

### 배운 점
- REST API 설계 및 구현
- JWT 기반 인증 시스템
- 실시간 양방향 통신 (WebSocket)
- 외부 API 연동 및 에러 처리
- 클라우드 배포 및 환경 변수 관리

---

## 감사합니다!

### 데모 사이트
- **Frontend**: https://jejumatch-nu.vercel.app
- **Backend API**: https://jejumatch-api-6f66.onrender.com

### 소스 코드
- **GitHub**: https://github.com/daewooon2/jejumatch

---

*JejuMatch - 제주대학교 학생들의 새로운 만남*
