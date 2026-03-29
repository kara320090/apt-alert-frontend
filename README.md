# Apt Alert Frontend

급매물 알리미 프론트엔드입니다. Next.js 기반이며, FastAPI 백엔드와 연결되는 구조로 정리되어 있습니다.

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속합니다.

## 필요한 환경변수

- `NEXT_PUBLIC_API_URL` : FastAPI 백엔드 주소
- `API_URL` : (선택) Next API Route에서 사용할 서버 전용 백엔드 주소
- `NEXT_PUBLIC_KAKAO_MAP_KEY` : 카카오맵 JavaScript 키
- `KAKAO_REST_API_KEY` : AI 입지 태그용 카카오 로컬 REST 키

## 현재 기능

- 지역 / 등급 / 할인율 필터
- 급매 목록 조회
- 카카오맵 패널 표시
- AI 입지 태그
- 지역 리포트
- 구독 조건 저장

## 비고

- `.env.local` 은 ZIP에 포함하지 않았습니다.
- `node_modules`, `.next`, `.git` 도 제외했습니다.
