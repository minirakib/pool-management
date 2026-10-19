import { useState } from "react";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import SnookerTable from "@/components/snooker/SnookerTable.jsx";
import "./login.css";

/** Full-screen sign-in. Admin gets every page; User gets Tables, Bookings, POS and Arcade. */
export default function LoginPage() {
  const { settings } = useStore();
  const { signIn } = useUi();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const ok = await signIn(username, password);
    setBusy(false);
    if (!ok) { setError("Wrong username or password."); setPassword(""); }
  };

  return (
    <div className="login-screen">
      <div className="login-art" aria-hidden="true"><SnookerTable cloth={settings.defaultCloth || "green"} /></div>
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-mark"><span>C</span></div>
          <div><div className="brand-name">CUE<b>CORE</b></div><span>{settings.clubName}</span></div>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Use your staff account to open the club system.</p>
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck="false" required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <span className="login-password">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
          </span>
        </label>
        {error && <p className="login-error" role="alert"><Icon name="alert" />{error}</p>}
        <button className="button button-primary login-submit" type="submit" disabled={busy}><Icon name="check" />{busy ? "Checking…" : "Sign in"}</button>
        <div className="login-roles">
          <div><strong>Admin</strong><span>Full access</span></div>
          <div><strong>User</strong><span>Tables · Bookings · POS · Arcade</span></div>
        </div>
      </form>
    </div>
  );
}
