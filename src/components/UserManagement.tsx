"use client";

import { User } from "@/lib/types";
import { updateUserRoleAction, updateUserStatusAction } from "@/app/actions";
import { useState } from "react";
import { Search } from "lucide-react";

export function UserManagement({ users, currentUserId }: { users: User[], currentUserId: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" || currentRole === "hr" ? "user" : "hr";
    await updateUserRoleAction(userId, newRole as any);
  };

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    await updateUserStatusAction(userId, !isActive);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>
      
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => {
              const isAdmin = u.email === "hafiffi@iiumholdings.com.my";
              const isSelf = u.id === currentUserId;
              const disabled = isAdmin || isSelf;

              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'hr' ? 'badge-warning' : 'badge-info'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-default'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleRoleToggle(u.id, u.role)}
                        disabled={disabled}
                      >
                        {u.role === 'hr' ? 'Remove HR' : 'Make HR'}
                      </button>
                      <button 
                        className={`btn ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleStatusToggle(u.id, u.isActive)}
                        disabled={disabled}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
