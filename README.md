# NIMDA Web Frontend

> 공주대학교 정보보안 동아리 **NIMDA** 통합 웹 플랫폼의 프론트엔드

|             |                                                                             |
| ----------- | --------------------------------------------------------------------------- |
| **Service** | [nimda.kr](https://nimda.kr)                                                |
| **Backend** | [Nimda-web-backend](https://github.com/Nimda-Security/Nimda-web-backend)    |
| **Stack**   | React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · React Router 7 · Tiptap   |
| **Deploy**  | Vercel                                                                      |

---

## Features

|               |                                                  |
| ------------- | ------------------------------------------------ |
| **Community** | 게시판 · 댓글 · 좋아요 · 알림 · 첨부파일 · 에디터 |
| **Members**   | 로그인 · 회원가입 · 마이페이지 · 유저 프로필      |
| **Activity**  | 출석 · 마일리지 · 배지 · 프로필 장식 · 상점       |
| **Contest**   | 님다콘 — 문제 · 제출 · 채점 현황 · 스코어보드     |
| **Admin**     | 관리자 대시보드 · 마일리지 관리                  |

---

## Getting Started

**요구 사항:** Node.js 20.19+ 또는 22.12+ (Vite 7 기준)

```bash
npm install
npm run dev     # http://localhost:3000
```

개발 서버는 다음 경로를 프록시합니다. 백엔드를 로컬에서 `8080` 포트로 띄워 두세요.

| 경로             | 대상                     |
| ---------------- | ------------------------ |
| `/api/*`         | `http://localhost:8080`  |
| `/solvedac-api/*`| `https://solved.ac/api`  |

### Scripts

| 명령              | 설명                             |
| ----------------- | -------------------------------- |
| `npm run dev`     | 개발 서버 실행                   |
| `npm run build`   | 프로덕션 빌드 (`dist/`)          |
| `npm run preview` | 빌드 결과 미리보기               |
| `npm run lint`    | ESLint 검사                      |
| `npm run format`  | Prettier 포맷 적용 (`src/`)      |

### Environment Variables

필수 환경변수는 없습니다. 아래 값은 지정하지 않으면 기본값을 사용합니다.

| 변수                       | 기본값        | 용도                       |
| -------------------------- | ------------- | -------------------------- |
| `VITE_API_BASE_URL`        | `/api`        | 스코어보드 API 베이스 URL  |
| `VITE_SCOREBOARD_ENDPOINT` | `/scoreboard` | 스코어보드 엔드포인트      |

---

## Project Structure

```
src/
├── api/          # 도메인별 API 클라이언트 (axios)
├── components/   # 공용 컴포넌트 (Layout, Button, Input, Notification ...)
├── constants/
├── domains/      # 페이지 단위 기능
│   ├── Board/    # 목록 · 상세 · 작성 · 수정 · 사진 게시판 · 상점
│   ├── Comment/
│   ├── Contest/  # 님다콘 홈 · 문제 · 스코어보드
│   ├── Home/
│   ├── User/     # 로그인 · 회원가입 · 마이페이지 · 프로필
│   ├── admin/
│   └── Error/
├── utils/
├── Router.tsx    # 라우트 정의
└── main.tsx
```

`@/`는 `src/`를 가리키는 경로 별칭입니다.

---

## Deployment

`main` 브랜치는 Vercel로 배포됩니다. 라우팅은 [`vercel.json`](./vercel.json)에서 관리합니다.

- `/api/*` → 백엔드 서버로 rewrite
- 그 외 경로 → `index.html` (SPA fallback)

프로덕션 빌드에서는 `console.*`과 `debugger`가 제거되고 소스맵은 생성되지 않습니다.
