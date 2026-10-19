/** Arcade coin sales and coin stock. */
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

const wholeCoins = (value) => { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : 0; };

/** Sells arcade coins at the current coin price and takes them out of the coin stock. */
export function sellArcadeCoins(s, values) {
  const coins = wholeCoins(values.coins);
  if (!coins) fail("Enter how many coins to sell (a whole number above 0).");
  if (coins > s.arcade.stock) fail(`Only ${s.arcade.stock} coins left. Add coins to the stock first.`);
  const price = Number(s.settings.arcadeCoinPrice) || 0;
  const amount = coins * price;
  const method = values.method || "Cash";
  const customer = values.customer?.trim() || "Walk-in";
  const date = new Date().toISOString();
  s.arcade.stock -= coins;
  const receipt = { tableName: "Arcade coins", customer, endedAt: Date.now(), tableCharge: 0, products: [{ name: "Arcade coin", qty: coins, price }], previousBalance: 0, discount: 0, total: amount, method };
  s.transactions.push({ id: uid("tx"), type: "arcade", description: `Arcade · ${coins} coins`, customer, coins, coinPrice: price, amount, revenueAmount: amount, method, date, receipt });
  return { coins, amount, method };
}

/** mode "set": the stock becomes exactly `coins`; mode "add": `coins` are added. Every change is logged. */
export function updateArcadeStock(s, mode, coinsValue, note = "") {
  const coins = Number(coinsValue);
  if (!Number.isInteger(coins) || coins < 0 || (mode === "add" && coins === 0)) fail("Enter a whole number of coins.");
  const before = s.arcade.stock;
  s.arcade.stock = mode === "set" ? coins : before + coins;
  s.arcade.log.push({ id: uid("coin"), date: new Date().toISOString(), mode, coins, before, after: s.arcade.stock, note: note.trim() });
  return mode === "set" ? `Coin stock set to ${s.arcade.stock}.` : `${coins} coins added · stock now ${s.arcade.stock}.`;
}

export function saveArcadeSettings(s, values) {
  const price = Number(values.arcadeCoinPrice);
  if (!(price >= 0)) fail("Enter a valid coin price.");
  s.settings.arcadeCoinPrice = price;
  if (values.arcadeStock !== undefined && values.arcadeStock !== "" && Number(values.arcadeStock) !== s.arcade.stock) updateArcadeStock(s, "set", values.arcadeStock, "Set in Settings");
  return "Arcade settings saved.";
}
