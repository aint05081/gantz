import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="container">
          <div
  className="nav"
  style={{
    display: "flex",
    justifyContent: "center",   // ✅ 전체 중앙
    alignItems: "center",
    gap: 20,
  }}
>
  <Link href="/">Home</Link>
  <Link href="/photos">사진</Link>
  <Link href="/memos">메모</Link>
  <Link href="/people">AGENT</Link>
  <Link href="/login">간츠</Link>
</div>



          <div style={{ height: 18 }} />
          {children}
        </div>
      </body>
    </html>
  );
}
