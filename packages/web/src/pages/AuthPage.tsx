import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, track } from "../lib/session";
import { useAuth } from "../lib/auth";
import type { SessionUser } from "../types";

export function AuthPage() {
  const { setAuth } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const data = await api<{ token: string; user: SessionUser }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(data.token, data.user);
      track(mode === "signup" ? "signup_success" : "login_success");
      if (mode === "signup") nav("/app/profiles/new/solo?onboarding=1");
      else nav("/app");
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <Link className="brand" to="/">
        MusePilot
      </Link>
      <h1 style={{ marginTop: 28 }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="lede">
        7-day Pro trial is available after you sign in. It converts to a paid subscription unless you
        cancel.
      </p>
      <form className="form-grid card" onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {err && <p className="quota">{err}</p>}
        <button className="btn btn-primary" type="submit">
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <button
          className="btn btn-tertiary"
          type="button"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        >
          {mode === "signup" ? "I already have an account" : "Need an account"}
        </button>
        <p className="footer-note">Google sign-in appears here when GOOGLE_CLIENT_ID is configured on the server.</p>
      </form>
    </div>
  );
}
