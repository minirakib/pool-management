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
  { id: "usr-admin", name: "Mahmud Hasan", username: "admin", role: "admin", passwordHash: "d5581a1cf8c43e435e747d6ae8b6f8ba2b5b2670300d1bde5100efa9f0be3bba" },
  { id: "usr-staff", name: "Counter Staff", username: "staff", role: "user", passwordHash: "7570e69f38ab5eb149b5e5dc83eebf48815b46e9761a59e126e58a0fbe0d2249" }
];
