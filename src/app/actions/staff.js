/** Staff members. */
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

export function saveStaff(s, staffId, values) {
  const member = s.staff.find((entry) => entry.id === staffId);
  if (s.staff.some((entry) => entry.id !== member?.id && entry.username.toLowerCase() === values.username.trim().toLowerCase())) fail("Username must be unique.");
  const saved = { ...(member || { id: uid("stf") }), name: values.name.trim(), phone: values.phone.trim(), username: values.username.trim(), role: values.role, status: values.status, joined: values.joined, shift: values.shift.trim(), salary: Math.max(0, Math.round(Number(values.salary) || 0)) };
  if (member) Object.assign(member, saved);
  else s.staff.push(saved);
  return `${saved.name} details saved.`;
}

export function toggleStaffStatus(s, staffId) {
  const member = s.staff.find((entry) => entry.id === staffId);
  if (!member) return null;
  member.status = member.status === "Active" ? "Inactive" : "Active";
  return `${member.name} marked ${member.status.toLowerCase()}.`;
}
