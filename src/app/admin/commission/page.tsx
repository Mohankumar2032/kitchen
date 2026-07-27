import { connection } from "next/server";
import { CommissionPanel } from "@/components/admin/CommissionPanel";
import { getSettings } from "@/lib/store";

export default async function AdminCommissionPage() {
  await connection();
  const settings = await getSettings();
  return <CommissionPanel initial={settings} />;
}
