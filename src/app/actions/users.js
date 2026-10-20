/** Sign-in accounts (Admin / User). */
import { EMAIL_PATTERN, normalizeEmail, phoneKey } from "../../lib/auth.js";
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

/** values: name, username, role, email, phone, and passwordHash (required for a new user, optional on edit). */
export function saveUser(s, userId, values) {
  const username = values.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) fail("Username: 3–24 letters, numbers, dots, dashes or underscores.");
  if (s.users.some((u) => u.username === username && u.id !== userId)) fail("That username is already taken.");
  // Email and phone are how Forgot password finds the account, so each must belong to one user only.
  const email = normalizeEmail(values.email || "");
  const phone = (values.phone || "").trim();
  if (email && !EMAIL_PATTERN.test(email)) fail("Enter a valid email address.");
  if (phone && (phoneKey(phone).length < 10 || /[^\d\s()+-]/.test(phone))) fail("Enter a valid phone number.");
  if (email && s.users.some((u) => u.id !== userId && u.email && normalizeEmail(u.email) === email)) fail("Another user already has that email.");
  if (phone && s.users.some((u) => u.id !== userId && u.phone && phoneKey(u.phone) === phoneKey(phone))) fail("Another user already has that phone number.");
  const user = s.users.find((u) => u.id === userId);
  const role = values.role === "admin" ? "admin" : "user";
  if (user?.role === "admin" && role !== "admin" && s.users.filter((u) => u.role === "admin").length === 1) fail("Keep at least one Admin account.");
  if (!user && !values.passwordHash) fail("Set a password for the new user.");
  const saved = { ...(user || { id: uid("usr") }), name: values.name.trim() || username, username, role, email, phone, ...(values.passwordHash ? { passwordHash: values.passwordHash } : {}) };
  if (user) Object.assign(user, saved);
  else s.users.push(saved);
  return `${saved.name} ${user ? "updated" : "added"}.`;
}

/** Forgot password: sets a new password after the emailed / texted code was confirmed. */
export function resetPassword(s, userId, passwordHash) {
  const user = s.users.find((u) => u.id === userId);
  if (!user) fail("That account no longer exists.");
  if (!passwordHash) fail("Set a new password.");
  user.passwordHash = passwordHash;
  return "Password changed.";
}

export function deleteUser(s, userId, currentUserId) {
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  if (user.id === currentUserId) fail("You cannot delete the account you are signed in with.");
  if (user.role === "admin" && s.users.filter((u) => u.role === "admin").length === 1) fail("Keep at least one Admin account.");
  s.users = s.users.filter((u) => u.id !== userId);
  return `${user.name} removed.`;
}
