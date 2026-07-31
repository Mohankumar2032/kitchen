import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { isAdminSessionFromCookies } from "@/lib/admin-auth-server";

export default async function AdminLoginPage() {
  if (await isAdminSessionFromCookies()) {
    redirect("/admin/orders");
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-3 py-10">
      <Suspense
        fallback={
          <div className="panel w-full max-w-md p-6 text-center text-muted">
            Loading…
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
