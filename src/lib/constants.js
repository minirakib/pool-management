export const categories = ["Standard", "Premium", "VIP", "Billiards"];
export const expenseCategories = ["Rent", "Electricity", "Staff Salary", "Maintenance", "Equipment", "Internet", "Cleaning", "Other"];
export const expenseMethods = ["Cash", "bKash", "Nagad", "Card", "Bank transfer"];
/** Icon per product category; custom categories fall back to a box. Categories themselves live in state.productCategories. */
const PRODUCT_ICONS = { Water: "droplet", "Soft Drinks": "bottle", "Tea & Coffee": "cup", Accessories: "cue", Snacks: "cookie" };
export const productIcon = (category) => PRODUCT_ICONS[category] || "box";
export const paymentMethods = ["Cash", "bKash", "Nagad", "Card", "Customer Credit"];
export const salaryMethods = ["Cash", "Bank transfer", "bKash", "Nagad"];

/** Snooker board (cloth) colours. CSS presets live in styles/tables.css under [data-cloth]. */
export const clothColors = [
  { id: "green", name: "Classic green", light: "#12804f", dark: "#0b5c39" },
  { id: "blue", name: "Tournament blue", light: "#1f6fb8", dark: "#13508a" },
  { id: "red", name: "Red", light: "#a8323a", dark: "#7d1f27" },
  { id: "purple", name: "Purple", light: "#6b3fa8", dark: "#4c2a80" },
  { id: "teal", name: "Teal", light: "#10857f", dark: "#0b625e" },
  { id: "grey", name: "Grey", light: "#5b6670", dark: "#424b53" },
  { id: "black", name: "Black", light: "#2e3236", dark: "#1d1f22" }
];
