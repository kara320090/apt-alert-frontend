/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://dapi.kakao.com",
              "style-src 'self' 'unsafe-inline' https://dapi.kakao.com",
              "img-src 'self' data: blob: https://*.kakao.com https://*.kakaocdn.net",
              "connect-src 'self' https://*.kakao.com https://*.kakaocdn.net",
              "frame-src 'self' https://*.kakao.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;