import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export default async function LoginPage() {
  const user = await getCurrentUser();
  
  if (user) {
    redirect("/");
  }

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="login-header">
          <Clock className="login-logo" size={48} />
          <h1 className="login-title">e-attendance</h1>
          <p className="login-subtitle">Sign in to manage your attendance</p>
        </div>
        
        <div className="login-actions">
          <a href="/api/auth/login" className="btn btn-primary btn-block">
            Sign in with Microsoft
          </a>
          
          {process.env.NODE_ENV !== "production" && (
            <a href="/api/dev-login" className="btn btn-secondary btn-block mt-4">
              Developer Bypass (Local Only)
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
