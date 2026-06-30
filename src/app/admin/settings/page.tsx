import { requireAnyRole } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  await requireAnyRole(["admin"]);
  const settings = await getSettings();
  
  return (
    <div>
      <h1 className="page-title mb-6" style={{ marginBottom: '1.5rem' }}>System Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
