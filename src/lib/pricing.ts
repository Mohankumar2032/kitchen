import { discountPercent } from "./types";
import { formatINR } from "./utils";

export function priceParts(sellPrice: number, mrp?: number) {
  const off = discountPercent(sellPrice, mrp);
  return {
    sell: formatINR(sellPrice),
    mrp: mrp && mrp > sellPrice ? formatINR(mrp) : null,
    off,
  };
}
