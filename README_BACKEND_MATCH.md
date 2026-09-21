# Backend 연결 안내

현재 Frontend는 매물 조회 서버와 이메일 구독 서버를 별도로 사용합니다. 전체 실행 방법은 [README](README.md)를 참고하세요.

| 환경변수 | 대상 | 호출 경로 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | 매물 조회 Backend | `/regions`, `/listings`, `/filter` |
| `EMAIL_API_BASE_URL` | 이메일 Backend | `/subscribe`, `/unsubscribe` |

브라우저의 `/api/subscribe`와 `/api/unsubscribe` 요청은 Next.js API Route를 거쳐 이메일 Backend로 전달됩니다. 현재 코드는 `EMAIL_API_BASE_URL`이 없으면 오류를 반환하며 `API_URL`로 자동 대체하지 않습니다.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
EMAIL_API_BASE_URL=http://localhost:8001
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_javascript_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
GEMINI_API_KEY=your_gemini_api_key
```

포트는 로컬 구성 예시입니다. 이메일 API는 [backend_email](https://github.com/kara320090/backend_email)의 설정과 맞춥니다.

근거 코드: [매물 API](lib/api.js), [구독 프록시](app/api/subscribe/route.js), [해제 프록시](app/api/unsubscribe/route.js).
