# 🚀 JejuMatch 빠른 배포 가이드

이 문서는 JejuMatch를 실제 웹에 배포하는 과정을 **단계별 체크리스트** 형식으로 안내합니다.

전체 상세 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

---

## 📋 배포 체크리스트

### ☁️ 1단계: Cloudinary 설정 (이미지 저장소)

- [ ] https://cloudinary.com/users/register/free 에서 무료 계정 생성
- [ ] 이메일 인증 완료
- [ ] Dashboard에서 다음 정보 복사:
  - Cloud Name: `________________`
  - API Key: `________________`
  - API Secret: `________________`

---

### 🗄️ 2단계: MongoDB Atlas 설정 (데이터베이스)

- [ ] https://www.mongodb.com/cloud/atlas/register 에서 무료 계정 생성
- [ ] FREE (M0) 클러스터 생성 (Seoul 리전 선택)
- [ ] 데이터베이스 사용자 생성:
  - Username: `________________`
  - Password: `________________`
- [ ] Network Access에서 0.0.0.0/0 허용
- [ ] Connection String 복사:
  ```
  mongodb+srv://사용자명:비밀번호@클러스터주소/jejumatch?retryWrites=true&w=majority
  ```
  - 복사한 문자열: `________________`

---

### 🔧 3단계: Render 배포 (백엔드)

- [ ] https://render.com 에서 GitHub 계정으로 가입
- [ ] Web Service 생성:
  - Name: `jejumatch-api`
  - Root Directory: `server`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Plan: Free

- [ ] 환경 변수 설정:
  ```
  NODE_ENV = production
  PORT = 10000
  MONGODB_URI = (2단계에서 복사한 MongoDB 연결 문자열)
  JWT_SECRET = (랜덤한 긴 문자열, 예: your-super-secret-key-12345)
  CLOUDINARY_CLOUD_NAME = (1단계의 Cloud Name)
  CLOUDINARY_API_KEY = (1단계의 API Key)
  CLOUDINARY_API_SECRET = (1단계의 API Secret)
  CLIENT_URL = https://your-app.vercel.app (나중에 변경)
  ```

- [ ] 배포 완료 대기 (약 5분)
- [ ] Render URL 복사: `https://________________.onrender.com`
- [ ] Health check 확인: `https://________________.onrender.com/health`
  - 응답: `{"status":"OK","message":"Server is running"}`

---

### 🎨 4단계: Vercel 배포 (프론트엔드)

- [ ] https://vercel.com/signup 에서 GitHub 계정으로 가입
- [ ] 프로젝트 Import:
  - Repository: DatingApp 선택
  - Framework Preset: Create React App
  - Root Directory: `client`

- [ ] 환경 변수 설정:
  ```
  REACT_APP_API_URL = https://________________.onrender.com/api
  REACT_APP_SOCKET_URL = https://________________.onrender.com
  ```
  (3단계에서 복사한 Render URL 사용)

- [ ] Deploy 클릭
- [ ] 배포 완료 대기 (약 2분)
- [ ] Vercel URL 복사: `https://________________.vercel.app`

---

### 🔄 5단계: CORS 설정 업데이트

- [ ] Render Dashboard → jejumatch-api → Environment
- [ ] `CLIENT_URL` 값을 Vercel URL로 변경:
  ```
  CLIENT_URL = https://________________.vercel.app
  ```
  (4단계에서 복사한 Vercel URL 사용)

- [ ] Save Changes → 재배포 대기 (약 3분)

---

### ✅ 6단계: 배포 확인

- [ ] Vercel 앱 접속: `https://________________.vercel.app`
- [ ] 회원가입 페이지가 보이는지 확인
- [ ] 회원가입 테스트:
  - [ ] 회원가입 완료
  - [ ] 로그인 성공
  - [ ] 프로필 생성
  - [ ] 사진 업로드 (Cloudinary에 저장됨)
  - [ ] 다른 사용자 탐색
  - [ ] 매칭 기능
  - [ ] 채팅 기능

---

## 🎉 배포 완료!

축하합니다! JejuMatch가 성공적으로 배포되었습니다.

### 배포된 URL
- 프론트엔드: `https://________________.vercel.app`
- 백엔드 API: `https://________________.onrender.com`

### 다음 단계
- URL을 친구들과 공유하세요
- 피드백을 받아 기능을 개선하세요
- 코드 수정 후 `git push`하면 자동 재배포됩니다

---

## 🆘 문제가 발생했나요?

### 자주 발생하는 문제

**1. 백엔드 500 에러**
- Render Dashboard → Logs에서 오류 확인
- MongoDB URI가 정확한지 확인 (비밀번호 특수문자는 URL 인코딩)
- 모든 환경 변수가 설정되었는지 확인

**2. 프론트엔드 API 연결 실패**
- Render의 CLIENT_URL이 Vercel URL과 정확히 일치하는지 확인
- Vercel의 REACT_APP_API_URL이 Render URL을 가리키는지 확인
- Render 백엔드가 정상 작동하는지 health check 확인

**3. 사진 업로드 실패**
- Cloudinary 환경 변수 3개 모두 정확히 입력되었는지 확인
- Cloudinary Dashboard에서 크레딧이 남아있는지 확인

**4. Render 서버가 느림**
- 무료 티어는 15분 동안 요청이 없으면 슬립 모드
- 첫 요청 시 30초 정도 소요 (정상)
- 유료 플랜($7/월)으로 업그레이드하면 항상 켜져있음

### 추가 도움이 필요하면

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 상세 배포 가이드
- [README.md](./README.md) - 프로젝트 개요
- Render 문서: https://render.com/docs
- Vercel 문서: https://vercel.com/docs
- MongoDB Atlas 문서: https://docs.atlas.mongodb.com
- Cloudinary 문서: https://cloudinary.com/documentation

---

## 💡 팁

### 코드 업데이트하기
로컬에서 코드 수정 후:
```bash
git add .
git commit -m "수정 내용"
git push
```
- Vercel: 자동 재배포 (약 2분)
- Render: 자동 재배포 (약 5분)

### 환경 변수 변경하기
- Render: Dashboard → Environment → Save Changes → 재배포
- Vercel: Settings → Environment Variables → Save → Redeploy

### 로그 확인하기
- Render: Dashboard → Logs
- Vercel: Deployments → 최신 배포 → Runtime Logs

---

**행운을 빕니다! 🍀**
