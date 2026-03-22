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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://dapi.kakao.com https://*.kakao.com https://*.kakaocdn.net",
              "style-src 'self' 'unsafe-inline' https://dapi.kakao.com https://*.kakao.com https://*.kakaocdn.net",
              "img-src 'self' data: blob: https://*.kakao.com https://*.kakaocdn.net http://*.kakao.com",
              "connect-src 'self' https://*.kakao.com https://*.kakaocdn.net https://project1-zi6w.onrender.com",
              "frame-src 'self' https://*.kakao.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;