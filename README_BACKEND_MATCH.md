# 프론트 실행 방법

## 1. 환경변수
프로젝트 루트에서 `.env.example`을 복사해 `.env.local`로 만든 뒤 값을 채웁니다.

```bash
cp .env.example .env.local
```

예시:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_javascript_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

## 2. 백엔드와 연결되는 엔드포인트
이 프론트는 아래 백엔드와 맞물리도록 수정되어 있습니다.

- `GET /regions`
- `GET /filter`
- `POST /subscribe`
- `GET /health`

## 3. 실행

```bash
npm install
npm run dev
```

## 4. 주의
- 구독 저장은 `app/api/subscribe/route.js`를 거쳐 백엔드 `/subscribe`로 전달됩니다.
- 급매 목록 조회는 `/filter`를 사용합니다.
- 지역 목록은 `/regions`를 사용합니다.
- AI 입지 태그는 `app/api/ai/listing-tags/route.js`와 `KAKAO_REST_API_KEY`가 필요합니다.
