import "./globals.css";

export const metadata = {
  title: "[PC통신] — 사용의 차이가 결과의 차이를 만든다",
  description:
    "AI를 읽고, 써보고, 만들고, 공유하는 AI 활용 동호회 [PC통신]의 디지털 매거진.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
