/** Sign-in accounts (Admin / User). */
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

/** values: name, username, role, and passwordHash (required for a new user, optional on edit). */
export function saveUser(s, userId, values) {
  const username = values.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) fail("Username: 3–24 letters, numbers, dots, dashes or underscores.");
  if (s.users.some((u) => u.username === username && u.id !== userId)) fail("That username is already taken.");
  const user = s.users.find((u) => u.id === userId);
  const role = values.role === "admin" ? "admin" : "user";
  if (user?.role === "admin" && role !== "admin" && s.users.filter((u) => u.role === "admin").length === 1) fail("Keep at least one Admin account.");
  if (!user && !values.passwordHash) fail("Set a password for the new user.");
  const saved = { ...(user || { id: uid("usr") }), name: values.name.trim() || username, username, role, ...(values.passwordHash ? { passwordHash: values.passwordHash } : {}) };
  if (user) Object.assign(user, saved);
  else s.users.push(saved);
  return `${saved.name} ${user ? "updated" : "added"}.`;
}

export function deleteUser(s, userId, currentUserId) {
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  if (user.id === currentUserId) fail("You cannot delete the account you are signed in with.");
  if (user.role === "admin" && s.users.filter((u) => u.role === "admin").length === 1) fail("Keep at least one Admin account.");
  s.users = s.users.filter((u) => u.id !== userId);
  return `${user.name} removed.`;
}
