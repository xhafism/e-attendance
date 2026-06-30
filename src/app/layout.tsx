import "./index.css";
import { getCurrentUser } from "@/lib/auth";
import { Clock, Map, Settings, Users, LogOut, LayoutDashboard } from "lucide-react";

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
              <a href="/map" className="nav-item">
                <Map className="nav-icon" size={20} />
                <span>Live Map</span>
              </a>
              
              {(user.role === "admin" || user.role === "hr") && (
                <>
                  <div className="nav-group-title">Admin</div>
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
            <header className="top-header">
              <h2 className="page-title">Attendance Portal</h2>
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
