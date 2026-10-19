/** Table bookings and overlap checks. */
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

const minutes = (hhmm) => hhmm.split(":").reduce((h, m) => h * 60 + Number(m), 0);

export function bookingOverlaps(s, candidate, skipId = "") {
  if (candidate.status !== "Confirmed" || !candidate.tableId) return false;
  const start = minutes(candidate.start);
  const end = start + Number(candidate.duration) * 60;
  return s.bookings.some((booking) => {
    if (booking.id === skipId || booking.status !== "Confirmed" || booking.date !== candidate.date || booking.tableId !== candidate.tableId) return false;
    const otherStart = minutes(booking.start);
    return start < otherStart + Number(booking.duration) * 60 && otherStart < end;
  });
}

export function saveBooking(s, bookingId, values) {
  const customer = s.customers.find((entry) => entry.id === values.customerId);
  const candidate = { id: bookingId || uid("bok"), customerId: values.customerId, tableId: values.tableId || "", date: values.date, start: values.start, duration: Number(values.duration), phone: values.phone.trim(), status: values.status, notes: values.notes.trim() };
  if (bookingOverlaps(s, candidate, bookingId)) fail("That table already has a confirmed booking during this time.");
  const previous = s.bookings.find((entry) => entry.id === bookingId);
  if (previous) Object.assign(previous, candidate);
  else s.bookings.push(candidate);
  return `Booking for ${customer?.name || "guest"} saved.`;
}

const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

export function cycleBookingStatus(s, bookingId) {
  const booking = s.bookings.find((entry) => entry.id === bookingId);
  if (!booking) return null;
  const candidate = { ...booking, status: BOOKING_STATUSES[(BOOKING_STATUSES.indexOf(booking.status) + 1) % BOOKING_STATUSES.length] };
  if (bookingOverlaps(s, candidate, bookingId)) fail("This status change would overlap another confirmed booking.");
  booking.status = candidate.status;
  return `Booking marked ${booking.status.toLowerCase()}.`;
}
