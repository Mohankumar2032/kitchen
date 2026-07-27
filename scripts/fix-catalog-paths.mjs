import { promises as fs } from "node:fs";

async function main() {
  const raw = await fs.readFile("data/db.json", "utf8");
  const fixed = raw.replace(
    /\/products\/catalog\/(prod-\d+(?:-\d+)?)\.png/g,
    "/products/catalog/$1.webp"
  );
  // Also repair already-broken `.webp` paths missing the basename
  const broken = /\/products\/catalog\/\.webp/g;
  if (broken.test(fixed)) {
    throw new Error(
      "db.json still has broken /products/catalog/.webp paths; restore from git first"
    );
  }

  await fs.writeFile("data/db.json", fixed, "utf8");
  const db = JSON.parse(fixed);
  await fs.writeFile(
    "data/catalog.json",
    JSON.stringify(
      {
        version: db.version ?? 1,
        settings: db.settings,
        categories: db.categories ?? [],
        products: db.products,
      },
      null,
      2
    ),
    "utf8"
  );
  await fs.writeFile(
    "data/orders.json",
    JSON.stringify(
      {
        version: db.ordersVersion ?? 1,
        orders: db.orders ?? [],
        enquiries: db.enquiries ?? [],
      },
      null,
      2
    ),
    "utf8"
  );

  const samples = (fixed.match(/\/products\/catalog\/[^"]+/g) || []).slice(0, 4);
  console.log("samples:", samples);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
