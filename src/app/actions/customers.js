/** Customer accounts. */
import { todayISO, uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

export function saveCustomer(s, customerId, values) {
  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || !/^[+()\d\s.-]+$/.test(phone)) fail("Enter a valid phone number using 7–15 digits.");
  const customer = s.customers.find((entry) => entry.id === customerId);
  if (s.customers.some((entry) => entry.id !== customer?.id && entry.phone.replace(/\D/g, "") === digits)) fail("A customer with this phone number already exists.");
  const saved = { ...(customer || { id: uid("cus"), registered: todayISO(), sessions: 0, spending: 0, balance: 0 }), name: values.name.trim(), phone, email: values.email.trim(), membership: values.membership, notes: values.notes.trim() };
  if (customer) Object.assign(customer, saved);
  else s.customers.push(saved);
  return `${saved.name} ${customer ? "updated" : "added"}.`;
}
