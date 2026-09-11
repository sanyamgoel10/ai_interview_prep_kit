import "./globals.css";
import KeepAlive from "@/components/KeepAlive";

export const metadata = {
  title: "AI Interview Prep Kit",
  description: "Turn any job description into a personalised interview prep kit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        <KeepAlive />
        {children}
      </body>
    </html>
  );
}
