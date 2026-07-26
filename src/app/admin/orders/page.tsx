export default function AdminOrdersPage() {
  return (
    <div className="fade-up">
      <h1 className="text-xl font-semibold">Orders</h1>
      <p className="mt-1 text-muted">
        No orders yet. Checkout / order flow will connect after DB setup.
      </p>
      <div className="mt-6 rounded-[6px] border border-dashed border-border p-8 text-center text-muted">
        <i className="fa-solid fa-bag-shopping mb-2 text-2xl text-theme" aria-hidden />
        <div>Orders list will appear here.</div>
      </div>
    </div>
  );
}
