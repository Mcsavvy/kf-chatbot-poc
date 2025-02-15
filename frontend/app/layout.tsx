import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ErrorBoundaryWithAuth } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ErrorBoundaryWithAuth>{children}</ErrorBoundaryWithAuth>
          <Toaster richColors />
        </AuthProvider>
      </body>
    </html>
  );
}