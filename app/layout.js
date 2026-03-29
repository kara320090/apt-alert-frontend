import "./globals.css";

export const metadata = {
  title: "급매물 알리미",
  description: "실거래가 기반 급매물 자동 감지 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
