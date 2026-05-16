[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Lvs6kcL8)

<div align="center">

<img src="logo6.png" alt="페스티켓 로고" width="120" />

# 페스티켓 (FestiCket)

**캠퍼스의 모든 행사, 한 곳에서**

대학 축제 참여·관리 올인원 플랫폼

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-페스티켓_체험하기-7c3aed?style=for-the-badge)](https://staging.d25a68jt9cg4tx.amplifyapp.com/login)
[![GitHub Pages](https://img.shields.io/badge/📄_GitHub_Pages-프로젝트_소개-6366f1?style=for-the-badge)](https://kookmin-sw.github.io/2026-capstone-56/)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Amplify-FF9900?logo=amazonaws&logoColor=white)

</div>

---

## 1. 프로젝트 소개

매 학기 진행되는 수백 개의 캠퍼스 행사들이 여전히 SNS 댓글, 구글 폼, 현장 줄서기로 운영되고 있습니다.
주최자는 참가자 관리에 지치고, 참가자는 정보를 찾기 어렵습니다.

**페스티켓**은 행사 개설부터 참가 신청, 결제, QR 티켓 발급, 현장 체크인까지 전 과정을 하나의 웹 플랫폼에서 해결합니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 🎟️ **QR 티켓** | 신청 즉시 고유 QR 코드 티켓 발급 |
| ⚡ **실시간 체크인** | QR 스캔으로 빠른 현장 입장 처리 |
| 💳 **간편 결제** | 토스페이먼츠 연동 (카드·간편결제·계좌이체) |
| 🏫 **학교 인증** | 대학 이메일 인증으로 소속 확인 |
| 📊 **운영 대시보드** | 신청 현황·체크인율·환불 실시간 모니터링 |
| 🔔 **알림 시스템** | 행사 변경·티켓 확정 등 실시간 알림 |
| 🟡 **카카오 로그인** | 소셜 로그인 + 학교 이메일 인증 연동 |
| 👥 **역할 기반 권한** | 참가자·인증주최자·학교관리자·운영자 |

---

## 2. 소개 영상

> 준비 중입니다. 영상이 업로드되면 여기에 추가될 예정입니다.

<!-- 영상 업로드 후 아래 주석을 해제하고 링크를 교체하세요 -->
<!--
[![페스티켓 소개 영상](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=VIDEO_ID)
-->

---

## 3. 팀 소개

**국민대학교 소프트웨어융합대학 2026 캡스톤 56팀**

| | 이름 | 학번 | 담당 |
|---|---|---|---|
| 👤 | **이한결** | 20235277 | UI/UX · 편의 도메인 구현 |
| 👤 | **이주엽** | 20213058 | AWS 인프라 · 행사 관리 도메인 구현 |
| 👤 | **이창민** | 20235275 | GIT 관리 · 결제 도메인 구현 |
| 👤 | **김준형** | 20235272 | DB 설계 · 사용자 관리 도메인 구현 |

---

## 4. 사용법

### 요구사항

- **Node.js** 18 이상
- **npm** 9 이상
- **PostgreSQL** (Supabase 권장)

### 설치 및 실행

#### 1) 저장소 클론

```bash
git clone https://github.com/kookmin-sw/2026-capstone-56.git
cd 2026-capstone-56
git checkout dev
```

#### 2) 백엔드 설정

```bash
cd backend
npm install
```

`.env.example`을 복사해 `.env`를 생성하고 값을 채웁니다:

```bash
cp .env.example .env
```

```env
PORT=4000
DATABASE_URL="postgresql://..."      # Supabase 연결 URL (pooling)
DIRECT_URL="postgresql://..."        # Supabase 연결 URL (direct)
JWT_SECRET=your_jwt_secret
MAIL_USER=your-email@gmail.com
MAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5174
KAKAO_REST_API_KEY=your_kakao_key
TOSS_SECRET_KEY=test_sk_your_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key
```

DB 마이그레이션 후 서버 실행:

```bash
npx prisma migrate deploy
npm run dev
```

#### 3) 프론트엔드 설정

```bash
cd ../frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5174` 접속

#### 4) (선택) 테스트 데이터 생성

```bash
cd backend
node scripts/create-test-user.js
```

### 배포 환경

| 구분 | 서비스 |
|------|--------|
| 프론트엔드 | AWS Amplify |
| 백엔드 | AWS Amplify (Node.js) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 스토리지 | Supabase Storage |
| 결제 | 토스페이먼츠 |

---

## 5. 기타

### 기술 스택

**Frontend**
- React 18, Vite, Tailwind CSS
- React Query, React Router, Framer Motion

**Backend**
- Node.js, Express, Prisma ORM
- JWT 인증, Nodemailer

**외부 서비스**
- 토스페이먼츠 (결제)
- 카카오 OAuth (소셜 로그인)
- Supabase (DB + 스토리지)
- AWS Amplify (배포)

### 역할 권한 구조

```
ATTENDEE     → 일반 참가자 (기본값)
CERTIFIED    → 인증된 행사 주최자
SCHOOL_ADMIN → 학교별 관리자
OPERATOR     → 슈퍼 운영자 (전체 관리)
```

### 라이선스

이 프로젝트는 학술 목적으로 제작된 캡스톤 디자인 프로젝트입니다.

---

<div align="center">

**© 2026 페스티켓 · 국민대학교 소프트웨어융합대학 캡스톤 56팀**

[🌐 프로젝트 페이지](https://kookmin-sw.github.io/2026-capstone-56/) · [🚀 데모 사이트](https://staging.d25a68jt9cg4tx.amplifyapp.com/login)

</div>
