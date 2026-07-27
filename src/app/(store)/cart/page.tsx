import { CartContents } from "@/components/storefront/CartContents";

export default function CartPage() {
  return (
    <main>
      <div className="container-store py-4 sm:py-6 lg:py-8">
        <h1 className="section-title mb-4 sm:mb-5">Your cart</h1>
        <CartContents />
      </div>
    </main>
  );
}
