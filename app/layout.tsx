export const metadata = {
  title: "Ms.Giang English Center",
  description: "Official V48 UI port"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
