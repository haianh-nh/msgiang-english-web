import "./globals.css";
export const metadata = { title: "Ms.Giang English" };
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="vi"><body>{children}</body></html>;
}
