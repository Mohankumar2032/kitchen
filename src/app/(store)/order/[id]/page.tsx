import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OrderPaymentPanel } from "@/components/storefront/OrderPaymentPanel";
import { getOrderById, getSettings } from "@/lib/store";
import { toPublicOrder } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function OrderConfirmation({ params }: Props) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    getOrderById(id),
    getSettings(),
  ]);
  if (!order) notFound();

  return (
    <div className="container-store max-w-2xl py-6 sm:py-10">
      <OrderPaymentPanel
        initialOrder={toPublicOrder(order)}
        settings={settings}
      />
    </div>
  );
}

export default function OrderConfirmationPage({ params }: Props) {
  return (
    <main>
      <Suspense
        fallback={
          <div className="container-store max-w-2xl py-10 text-center text-muted">
            Loading order…
          </div>
        }
      >
        <OrderConfirmation params={params} />
      </Suspense>
    </main>
  );
}
