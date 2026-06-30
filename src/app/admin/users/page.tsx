import { requireAnyRole } from "@/lib/auth";
import { getUsers } from "@/lib/store";
import { UserManagement } from "@/components/UserManagement";

export default async function UsersPage() {
  const user = await requireAnyRole(["admin"]);
  const users = await getUsers();
  
  return (
    <div>
      <h1 className="page-title mb-6" style={{ marginBottom: '1.5rem' }}>User Management</h1>
      <UserManagement users={users} currentUserId={user.id} />
    </div>
  );
}
