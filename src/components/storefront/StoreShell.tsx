import { CartProvider } from "./CartProvider";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="page-shell flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </CartProvider>
  );
}
