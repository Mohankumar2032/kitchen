import { Suspense } from "react";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import { getSettings } from "@/lib/store";

async function CheckoutContent() {
  const settings = await getSettings();
  return <CheckoutForm settings={settings} />;
}

export default function CheckoutPage() {
  return (
    <main>
      <div className="container-store py-4 sm:py-6 lg:py-8">
        <h1 className="section-title mb-4 sm:mb-5">Checkout</h1>
        <Suspense
          fallback={<p className="text-muted">Loading checkout…</p>}
        >
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  );
}
