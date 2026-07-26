import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kitchen — Shop Kitchen Appliances",
    template: "%s | Kitchen",
  },
  description: "Shop quality kitchen appliances online. Fast delivery across India.",
};

const themeInitScript = `
(function(){
  try {
    var key = 'kitchen-theme';
    var saved = localStorage.getItem(key);
    var map = { festival: 'light-warm', ocean: 'light-ocean', emerald: 'light-emerald', rose: 'light-rose', light: 'light-warm' };
    var allowed = ['light-warm','light-ocean','light-emerald','light-rose'];
    var theme = allowed.indexOf(saved) >= 0 ? saved : (map[saved] || 'light-warm');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light-warm');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-full font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
