import type { Metadata, Viewport } from "next";
import "./index.css";
import { getCurrentUser } from "@/lib/auth";
import { Clock, Map, Settings, Users, LogOut, LayoutDashboard } from "lucide-react";

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
              {(user.role === "admin" || user.role === "hr") && (
                <>
                  <a href="/admin" className="nav-item">Analytics</a>
                  <a href="/admin/map" className="nav-item">Map</a>
                  <a href="/admin/logs" className="nav-item">Logs</a>
                  <a href="/admin/users" className="nav-item">Users</a>
                  <a href="/admin/settings" className="nav-item">Settings</a>
                </>
              )}
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
        </div>
      </body>
    </html>
  );
}
