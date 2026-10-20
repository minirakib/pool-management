/**
 * Local sign-in for the two user levels: admin (every page) and user (pages marked
 * access: "user" in app/routes.js — Tables, Bookings, POS, Arcade).
 * Passwords are stored as SHA-256 hashes. This is a browser-only app, so it keeps staff on their
 * own pages; it is not protection against someone with access to the device's browser storage.
 */
export const ROLES = { admin: "Admin", user: "User" };

export async function hashPassword(username, password) {
  const bytes = new TextEncoder().encode(`cuecore:${username.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Starter accounts: admin / admin123 and staff / staff123. Change them in Settings → Users. */
export const defaultUsers = () => [
  { id: "usr-admin", name: "Mahmud Hasan", username: "admin", role: "admin", email: "admin@example.com", phone: "01711000000", passwordHash: "d5581a1cf8c43e435e747d6ae8b6f8ba2b5b2670300d1bde5100efa9f0be3bba" },
  { id: "usr-staff", name: "Counter Staff", username: "staff", role: "user", email: "staff@example.com", phone: "01711000001", passwordHash: "7570e69f38ab5eb149b5e5dc83eebf48815b46e9761a59e126e58a0fbe0d2249" }
];

// ---------- Password recovery contacts ----------

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (value = "") => value.trim().toLowerCase();
/** Phone numbers match on their last 10 digits, so 01711000000, +8801711000000 and 880 1711-000000 are the same. */
export const phoneKey = (value = "") => value.replace(/\D/g, "").slice(-10);
export const isEmail = (value = "") => value.includes("@");

/** The account whose email or phone matches what was typed on the Forgot password page. */
export function findUserByContact(users, value) {
  if (isEmail(value)) {
    const email = normalizeEmail(value);
    return users.find((u) => u.email && normalizeEmail(u.email) === email) || null;
  }
  const key = phoneKey(value);
  return key.length === 10 ? users.find((u) => u.phone && phoneKey(u.phone) === key) || null : null;
}

/** "ra•••@ibitltd.com" / "•••••••0123": enough to recognise, not enough to read off the screen. */
export function maskContact(value) {
  if (isEmail(value)) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
