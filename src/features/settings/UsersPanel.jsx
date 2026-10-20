import { useState } from "react";
import { deleteUser, saveUser } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { ConfirmModal, FormFooter } from "@/components/Modal.jsx";
import { Avatar, ChoiceGroup } from "@/components/ui";
import { hashPassword, ROLES } from "@/lib/auth.js";

/** Add / edit a sign-in account. The password is hashed before it reaches the store. */
function UserFormModal({ userId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { closeModal, notify } = useUi();
  const user = state.users.find((u) => u.id === userId);
  const [role, setRole] = useState(user?.role || "user");
  const [error, setError] = useState("");

  const submit = async (values) => {
    try {
      if (values.password && values.password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (values.password !== values.confirm) throw new Error("The two passwords do not match.");
      const passwordHash = values.password ? await hashPassword(values.username, values.password) : "";
      // Renaming a user without a new password would break their stored hash (it includes the username).
      if (user && !passwordHash && values.username.trim().toLowerCase() !== user.username) throw new Error("Set a new password when changing the username.");
      notify(run(saveUser, userId, { ...values, role, passwordHash }));
      closeModal();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Modal title={user ? `Edit ${user.name}` : "Add user"} subtitle={user ? "Leave the password empty to keep the current one." : "Create a sign-in account."} error={error}
      onSubmit={submit} footer={<FormFooter label={<><Icon name="check" />{user ? "Save user" : "Add user"}</>} />}>
      <div className="form-grid">
        <label className="field"><span>Full name</span><input name="name" defaultValue={user?.name || ""} required maxLength={40} autoFocus /></label>
        <label className="field"><span>Username</span><input name="username" defaultValue={user?.username || ""} required maxLength={24} autoCapitalize="none" spellCheck="false" autoComplete="off" /></label>
        <label className="field"><span>Email</span><input name="email" type="email" defaultValue={user?.email || ""} maxLength={80} autoComplete="off" placeholder="For password reset" /></label>
        <label className="field"><span>Phone</span><input name="phone" type="tel" defaultValue={user?.phone || ""} maxLength={20} autoComplete="off" placeholder="01XXXXXXXXX" /></label>
        <div className="field field-wide">
          <span>Access level</span>
          <ChoiceGroup name="role" label="Access level" value={role} onChange={setRole} options={[["admin", "Admin", "Every page"], ["user", "User", "Tables · Bookings · POS · Arcade"]]} />
        </div>
        <label className="field"><span>{user ? "New password" : "Password"}</span><input name="password" type="password" minLength={6} required={!user} autoComplete="new-password" /></label>
        <label className="field"><span>Confirm password</span><input name="confirm" type="password" required={!user} autoComplete="new-password" /></label>
      </div>
    </Modal>
  );
}

/** Settings → Users: the Admin / User sign-in accounts. */
export default function UsersPanel() {
  const state = useStore();
  const { openModal, perform, user: me } = useUi();
  const remove = (u) => openModal(
    <ConfirmModal title={`Remove ${u.name}?`} message={`@${u.username} will no longer be able to sign in.`} confirmLabel="Remove user" danger
      onConfirm={() => perform(deleteUser, u.id, me.id)} />
  );

  return (
    <article className="panel settings-section">
      <div className="panel-heading">
        <div><h2>Users</h2><p>Admin: full access · User: Tables, Bookings, POS, Arcade</p></div>
        <button className="button button-sm button-primary" onClick={() => openModal(<UserFormModal />)}><Icon name="plus" />Add user</button>
      </div>
      {state.users.map((u) => (
        <div key={u.id} className="settings-row user-row">
          <Avatar name={u.name} />
          <div><strong>{u.name}{u.id === me.id && <em className="muted"> · you</em>}</strong><span>@{u.username}{[u.email, u.phone].filter(Boolean).map((c) => ` · ${c}`).join("") || " · no email or phone for password reset"}</span></div>
          <span className={`role-badge${u.role === "admin" ? "" : " user"}`}>{ROLES[u.role]}</span>
          <button className="icon-button" onClick={() => openModal(<UserFormModal userId={u.id} />)} aria-label={`Edit ${u.name}`}><Icon name="edit" /></button>
          {u.id !== me.id && <button className="icon-button" onClick={() => remove(u)} aria-label={`Remove ${u.name}`}><Icon name="trash" /></button>}
        </div>
      ))}
    </article>
  );
}
