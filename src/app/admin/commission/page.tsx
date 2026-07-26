import { CommissionPanel } from "@/components/admin/CommissionPanel";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminCommissionPage() {
  const settings = await getSettings();
  return <CommissionPanel initial={settings} />;
}
