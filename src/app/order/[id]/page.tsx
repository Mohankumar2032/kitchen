import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreShell } from "@/components/storefront/StoreShell";
import { getOrderById } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <StoreShell>
      <main>
        <div className="container-store max-w-2xl py-6 sm:py-10">
          <div className="panel fade-up p-6 text-center sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdf5] text-success">
              <i className="fa-solid fa-circle-check text-2xl" aria-hidden />
            </span>
            <h1 className="mt-4 text-[24px] font-bold tracking-tight">
              Thank you for your order!
            </h1>
            <p className="mt-2 text-muted">
              Order ID:{" "}
              <span className="font-semibold text-foreground">{order.id}</span>
            </p>
            <p className="mt-1 text-muted">
              We will confirm and ship to {order.city}, {order.state}.
            </p>
          </div>

          <div className="panel mt-5 p-4 sm:p-5">
            <h2 className="text-[16px] font-semibold">Order details</h2>
            <ul className="mt-3 space-y-2">
              {order.items.map((item) => (
                <li
                  key={`${item.productId}-${item.productName}`}
                  className="flex justify-between gap-2 border-b border-border pb-2 text-muted last:border-0"
                >
                  <span>
                    {item.productName} × {item.qty}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatINR(item.sellPrice * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between pt-1 text-[15px] font-bold">
              <span>Total</span>
              <span className="text-theme">{formatINR(order.subtotal)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/shop" className="btn btn-primary">
              Continue shopping
            </Link>
            <Link href="/" className="btn btn-ghost">
              Home
            </Link>
          </div>
        </div>
      </main>
    </StoreShell>
  );
}
