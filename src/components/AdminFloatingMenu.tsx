"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, LayoutDashboard, Map, Clock, Users, Home } from "lucide-react";
import Link from "next/link";

export function AdminFloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="admin-floating-menu" ref={menuRef}>
      <button 
        className={`admin-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Admin Menu"
      >
        <Settings size={24} />
      </button>
      
      {isOpen && (
        <div className="admin-menu-dropdown">
          <div className="admin-menu-header">Admin panel</div>
          <Link href="/" className="admin-menu-item">
            <Home size={18} />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin" className="admin-menu-item">
            <LayoutDashboard size={18} />
            <span>Analytics</span>
          </Link>
          <Link href="/admin/map" className="admin-menu-item">
            <Map size={18} />
            <span>Map</span>
          </Link>
          <Link href="/admin/logs" className="admin-menu-item">
            <Clock size={18} />
            <span>Logs</span>
          </Link>
          <Link href="/admin/users" className="admin-menu-item">
            <Users size={18} />
            <span>Users</span>
          </Link>
          <Link href="/admin/settings" className="admin-menu-item">
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </div>
      )}
    </div>
  );
}
