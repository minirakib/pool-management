/** Counter (POS) sales. */
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

export function completeSale(s, cart, discountValue, method) {
  if (!cart.length) fail("Add at least one product before completing a sale.");
  const shortage = cart.find((line) => line.qty > s.products.find((p) => p.id === line.productId)?.stock);
  if (shortage) fail(`${shortage.name} no longer has enough stock.`);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const discount = Math.min(subtotal, Math.max(0, Number(discountValue) || 0));
  const amount = Math.max(0, Math.round(subtotal - discount));
  const closedAt = Date.now();
  const receipt = { tableName: "Counter sale", customer: "Counter sale", endedAt: closedAt, tableCharge: 0, products: cart.map(({ name, qty, price }) => ({ name, qty, price })), previousBalance: 0, discount, total: amount, method };
  cart.forEach((line) => { s.products.find((p) => p.id === line.productId).stock -= line.qty; });
  s.transactions.push({ id: uid("tx"), type: "sale", description: `Counter sale · ${cart.reduce((sum, line) => sum + line.qty, 0)} items`, customer: "Counter sale", amount, revenueAmount: amount, method, date: new Date(closedAt).toISOString(), receipt });
  return { amount, method };
}
