import { Suspense } from "react";
import { TrackOrderForm } from "@/components/storefront/TrackOrderForm";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

async function TrackContent({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <div className="container-store max-w-lg py-6 sm:py-10">
      <TrackOrderForm initialId={(params.id || "").trim()} />
    </div>
  );
}

export default function TrackOrderPage({ searchParams }: Props) {
  return (
    <main>
      <Suspense
        fallback={
          <div className="container-store max-w-lg py-10 text-center text-muted">
            Loading…
          </div>
        }
      >
        <TrackContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
