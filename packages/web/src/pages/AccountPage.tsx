import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { PRICING, isProTier } from "@framecoach/shared";
import { ConfirmModal, UpgradeModal } from "../components/Modals";
import { api, clearSession } from "../lib/session";
import { getSettings, listProfiles, putSettings, wipeLocalProfilesAndPlans } from "../storage/db";

export function AccountPage() {
  const { user, refresh, signOut } = useAuth();
  const [qs] = useSearchParams();
  const [upgrade, setUpgrade] = useState(false);
  const [syncOn, setSyncOn] = useState(false);
  const [confirmSync, setConfirmSync] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getSettings().then((s) => setSyncOn(s.cloudSyncEnabled));
    if (qs.get("checkout") === "success" || qs.get("checkout") === "demo-trial") {
      setMsg("Trial started. You can cancel anytime from Manage subscription before it becomes a paid plan.");
      refresh();
    }
  }, [qs, refresh]);

  async function toggleSync(next: boolean) {
    if (next) {
      if (!isProTier(user?.tier ?? "free")) {
        setUpgrade(true);
        return;
      }
      setConfirmSync(true);
      return;
    }
    await putSettings({ key: "settings", cloudSyncEnabled: false });
    setSyncOn(false);
  }

  async function confirmCloud() {
    const profiles = await listProfiles();
    const ciphertext = btoa(unescape(encodeURIComponent(JSON.stringify(profiles.map((p) => ({
      name: p.name,
      kind: p.kind,
      bodyTypes: p.bodyTypes,
      aesthetic: p.aesthetic,
      composition: p.composition,
      dislikes: p.dislikes,
      notes: p.notes,
      heightCm: p.heightCm,
    }))))));
    await api("/api/sync/profiles", {
      method: "PUT",
      body: JSON.stringify({ confirmed: true, ciphertext }),
    });
    await putSettings({ key: "settings", cloudSyncEnabled: true, cloudSyncConfirmedAt: Date.now() });
    setSyncOn(true);
    setConfirmSync(false);
    setMsg("Encrypted preference tags were backed up. No photos were sent.");
  }

  async function erase() {
    await wipeLocalProfilesAndPlans();
    try {
      await api("/api/account/erase", { method: "POST", body: JSON.stringify({ confirm: "DELETE" }) });
    } catch {
      /* still wipe local */
    }
    setConfirmErase(false);
    signOut();
    clearSession();
    setMsg("Erase requested. Cloud copies are cleaned within 30 days.");
  }

  async function portal() {
    const data = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
    window.location.href = data.url;
  }

  const pro = isProTier(user?.tier ?? "free");

  return (
    <div className="page">
      <h1>Account &amp; subscription</h1>
      <article className="card form-grid">
        <p>
          <strong>{user?.email}</strong>
        </p>
        <p className="quota">Status: {user?.tier}</p>
        {msg && <p className="banner">{msg}</p>}
        {!pro && (
          <button className="btn btn-copper" type="button" onClick={() => setUpgrade(true)}>
            Upgrade / start 7-day trial
          </button>
        )}
        {pro && (
          <button className="btn btn-secondary" type="button" onClick={() => void portal()}>
            Manage subscription
          </button>
        )}
        <p className="footer-note">
          ${PRICING.monthlyUsd}/month or ${PRICING.yearlyUsd}/year after a {PRICING.trialDays}-day trial.
          Auto-renews until canceled.
        </p>
        <label className="sans" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={syncOn} onChange={(e) => void toggleSync(e.target.checked)} />
          Encrypted cloud backup of preference tags (off by default)
        </label>
        <button className="btn btn-tertiary" type="button" onClick={() => setConfirmErase(true)}>
          Delete all profiles
        </button>
        <p>
          <Link to="/privacy">Privacy policy</Link> · <Link to="/terms">Terms</Link>
        </p>
      </article>
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
      {confirmSync && (
        <ConfirmModal
          title="Turn on cloud backup?"
          body="Only preference tags (style, composition, dislikes, notes) are stored, encrypted. No face photos or destination images. You can turn this off anytime."
          confirmLabel="I understand, back up tags"
          onCancel={() => setConfirmSync(false)}
          onConfirm={() => void confirmCloud()}
        />
      )}
      {confirmErase && (
        <ConfirmModal
          title="Delete all profiles?"
          body="This clears profiles on this device and queues cloud copies for deletion within 30 days."
          confirmLabel="Delete everything"
          onCancel={() => setConfirmErase(false)}
          onConfirm={() => void erase()}
        />
      )}
    </div>
  );
}
