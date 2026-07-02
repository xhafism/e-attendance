import type { Metadata, Viewport } from "next";
import "./index.css";
import { getCurrentUser } from "@/lib/auth";
import { Clock, LogOut } from "lucide-react";
import { AdminFloatingMenu } from "@/components/AdminFloatingMenu";

export const metadata: Metadata = {
  title: "e-attendance",
  description: "Employee Attendance Portal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "e-attendance",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <div className="app-container top-nav-layout">
          <nav className="floating-nav">
            <div className="nav-brand">
              <Clock className="nav-logo" size={24} />
              <span className="nav-title">e-attendance</span>
            </div>
            <div className="nav-links">
              <a href="/" className="nav-item">Dashboard</a>
            </div>
            <div className="nav-user">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <a href="/api/auth/logout" className="logout-icon-btn" title="Logout">
                <LogOut size={20} />
              </a>
            </div>
          </nav>
          
          <main className="main-content">
            <div className="content-wrapper">
              {children}
            </div>
          </main>
          
          {(user.role === "admin" || user.role === "hr") && <AdminFloatingMenu />}
        </div>
      </body>
    </html>
  );
}
