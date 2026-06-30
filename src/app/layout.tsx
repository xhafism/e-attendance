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
        <div className="app-container">
          <aside className="sidebar">
            <div className="sidebar-header">
              <Clock className="logo-icon" />
              <span className="logo-text">e-attendance</span>
            </div>
            
            <nav className="sidebar-nav">
              <a href="/" className="nav-item">
                <LayoutDashboard className="nav-icon" size={20} />
                <span>Dashboard</span>
              </a>
              {(user.role === "admin" || user.role === "hr") && (
                <>
                  <div className="nav-group-title">Admin</div>
                  <a href="/admin" className="nav-item">
                    <LayoutDashboard className="nav-icon" size={20} />
                    <span>Analytics</span>
                  </a>
                  <a href="/admin/map" className="nav-item">
                    <Map className="nav-icon" size={20} />
                    <span>Live Map</span>
                  </a>
                  <a href="/admin/logs" className="nav-item">
                    <Clock className="nav-icon" size={20} />
                    <span>All Logs</span>
                  </a>
                  <a href="/admin/users" className="nav-item">
                    <Users className="nav-icon" size={20} />
                    <span>Users</span>
                  </a>
                  <a href="/admin/settings" className="nav-item">
                    <Settings className="nav-icon" size={20} />
                    <span>Settings</span>
                  </a>
                </>
              )}
            </nav>
            
            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
              <a href="/api/auth/logout" className="logout-btn">
                <LogOut size={16} />
                <span>Logout</span>
              </a>
            </div>
          </aside>
          
          <main className="main-content">
            <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h2 className="page-title">Attendance Portal</h2>
              <a href="/api/auth/logout" className="mobile-logout-btn" style={{ display: 'none', color: 'var(--danger-color)' }}>
                <LogOut size={20} />
              </a>
            </header>
            <div className="content-wrapper">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
