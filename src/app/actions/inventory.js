/** Products, stock and product categories. */
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

function cleanCategory(s, name, except = "") {
  const value = String(name || "").trim().replace(/\s+/g, " ");
  if (!value) fail("Enter a category name.");
  if (value.length > 30) fail("Category names can be up to 30 characters.");
  if (s.productCategories.some((c) => sameName(c, value) && !sameName(c, except))) fail(`“${value}” already exists.`);
  return value;
}

export function addProductCategory(s, name) {
  const value = cleanCategory(s, name);
  s.productCategories.push(value);
  return `Category “${value}” added.`;
}

/** Renames a category and moves every product in it to the new name. */
export function renameProductCategory(s, from, name) {
  const index = s.productCategories.indexOf(from);
  if (index < 0) fail("This category no longer exists.");
  const value = cleanCategory(s, name, from);
  s.productCategories[index] = value;
  s.products.forEach((p) => { if (p.category === from) p.category = value; });
  return `Category renamed to “${value}”.`;
}

/** Deletes an empty category; one that still has products must be emptied or renamed first. */
export function deleteProductCategory(s, name) {
  const used = s.products.filter((p) => p.category === name).length;
  if (used) fail(`Move or delete the ${used} product${used === 1 ? "" : "s"} in “${name}” first.`);
  if (s.productCategories.length <= 1) fail("Keep at least one category.");
  s.productCategories = s.productCategories.filter((c) => c !== name);
  return `Category “${name}” deleted.`;
}

export function saveProduct(s, productId, values) {
  const product = s.products.find((entry) => entry.id === productId);
  if (s.products.some((entry) => entry.id !== product?.id && entry.sku.toLowerCase() === values.sku.trim().toLowerCase())) fail("SKU must be unique.");
  if (Number(values.price) < 0 || Number(values.cost) < 0) fail("Prices cannot be negative.");
  // "New category…" in the form sends newCategory; it is created along with the product.
  let category = values.category;
  if (category === "__new__") {
    category = cleanCategory(s, values.newCategory);
    s.productCategories.push(category);
  } else if (!s.productCategories.includes(category)) fail("Choose a category.");
  const saved = { ...(product || { id: uid("prd") }), name: values.name.trim(), sku: values.sku.trim(), category, cost: Number(values.cost), price: Number(values.price), stock: Number(values.stock), threshold: Number(values.threshold) };
  if (product) Object.assign(product, saved);
  else s.products.push(saved);
  return `${saved.name} ${product ? "updated" : "added"} to inventory.`;
}

export function adjustStock(s, productId, delta) {
  const product = s.products.find((entry) => entry.id === productId);
  const next = product.stock + Number(delta);
  if (!Number.isInteger(Number(delta)) || next < 0) fail("Stock adjustment must be a whole number and cannot make stock negative.");
  product.stock = next;
  return `${product.name} stock adjusted to ${product.stock}.`;
}
