import * as actions from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import { Field, SelectField, TextareaField } from "@/components/ui";
import { todayISO } from "@/lib/format.js";

export default function BookingFormModal({ bookingId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const booking = state.bookings.find((b) => b.id === bookingId);
  const selectedCustomer = booking?.customerId || state.customers[0]?.id || "";

  return (
    <Modal title={booking ? "Edit booking" : "New booking"} subtitle="Reserve a table for a customer. Confirmed reservations cannot overlap." error={error}
      onSubmit={(values) => attempt(() => run(actions.saveBooking, bookingId, values))} footer={<FormFooter label={booking ? "Save booking" : "Create booking"} />}>
      <div className="form-grid">
        <SelectField label="Customer" name="customerId" options={state.customers.map((c) => [c.id, c.name])} value={selectedCustomer} />
        <SelectField label="Table preference" name="tableId" options={[["", "Any table"], ...state.tables.map((t) => [t.id, t.name])]} value={booking?.tableId || ""} />
        <Field label="Date" name="date" type="date" value={booking?.date || todayISO()} required />
        <Field label="Start time" name="start" type="time" value={booking?.start || "18:00"} required />
        <Field label="Duration (hours)" name="duration" type="number" value={booking?.duration || 1} min="1" max="12" step="1" required />
        <Field label="Contact number" name="phone" type="tel" value={booking?.phone || state.customers.find((c) => c.id === selectedCustomer)?.phone || ""} required />
        <SelectField label="Status" name="status" options={["Pending", "Confirmed", "Completed", "Cancelled"]} value={booking?.status || "Pending"} />
        <TextareaField label="Notes" name="notes" value={booking?.notes || ""} />
      </div>
    </Modal>
  );
}
