import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-border"
      style={{ background: "var(--footer-bg)" }}
    >
      <div className="container-store grid gap-6 py-8 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="icon-box-solid h-9 w-9">
              <i className="fa-solid fa-kitchen-set" aria-hidden />
            </span>
            <span className="text-[15px] font-bold">Kitchen</span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
            Everyday kitchen appliances and cookware with simple checkout and
            pan-India delivery.
          </p>
        </div>

        <div>
          <p className="mb-3 font-semibold">Shop</p>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/shop" className="hover:text-theme">
                All products
              </Link>
            </li>
            <li>
              <Link href="/shop?category=mixer-grinders" className="hover:text-theme">
                Mixer grinders
              </Link>
            </li>
            <li>
              <Link href="/shop?category=packs" className="hover:text-theme">
                Combo packs
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 font-semibold">Support</p>
          <ul className="space-y-2 text-muted">
            <li>Shipping across India</li>
            <li>Cash on delivery available</li>
            <li>orders@kitchen.store</li>
          </ul>
        </div>

        <div>
          <p className="mb-3 font-semibold">Why shop with us</p>
          <ul className="space-y-2 text-muted">
            <li>
              <i className="fa-solid fa-shield-halved mr-2 text-theme" aria-hidden />
              Secure checkout
            </li>
            <li>
              <i className="fa-solid fa-rotate-left mr-2 text-theme" aria-hidden />
              Easy returns
            </li>
            <li>
              <i className="fa-solid fa-headset mr-2 text-theme" aria-hidden />
              Friendly support
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-3 text-center text-muted">
        © {new Date().getFullYear()} Kitchen. All rights reserved.
      </div>
    </footer>
  );
}
