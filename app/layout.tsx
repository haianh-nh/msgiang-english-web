import "./globals.css";

export const metadata = {
  title: "Ms.Giang English Center",
  description: "Official production shell"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
