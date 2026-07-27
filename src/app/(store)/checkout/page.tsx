import { CheckoutForm } from "@/components/storefront/CheckoutForm";

export default function CheckoutPage() {
  return (
    <main>
      <div className="container-store py-4 sm:py-6 lg:py-8">
        <h1 className="section-title mb-4 sm:mb-5">Checkout</h1>
        <CheckoutForm />
      </div>
    </main>
  );
}
