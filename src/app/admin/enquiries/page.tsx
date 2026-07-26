export default function AdminEnquiriesPage() {
  return (
    <div className="fade-up">
      <h1 className="text-xl font-semibold">Enquiries</h1>
      <p className="mt-1 text-muted">
        Customer enquiries from the storefront will land here.
      </p>
      <div className="mt-6 rounded-[6px] border border-dashed border-border p-8 text-center text-muted">
        <i className="fa-solid fa-envelope-open-text mb-2 text-2xl text-theme" aria-hidden />
        <div>No enquiries yet.</div>
      </div>
    </div>
  );
}
