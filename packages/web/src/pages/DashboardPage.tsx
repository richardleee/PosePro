import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listPlans, listProfiles, getTodayUsage } from "../storage/db";
import { effectiveLimits, isProTier } from "@framecoach/shared";

export function DashboardPage() {
  const { user } = useAuth();
  const [solo, setSolo] = useState(0);
  const [plans, setPlans] = useState(0);
  const [used, setUsed] = useState(0);

  useEffect(() => {
    listProfiles().then((p) => setSolo(p.filter((x) => x.kind === "solo").length));
    listPlans().then((p) => setPlans(p.length));
    getTodayUsage().then(setUsed);
  }, []);

  const limits = effectiveLimits(user?.tier ?? "free");
  const daily = Number.isFinite(limits.maxPlannerGenerationsPerDay)
    ? `${used}/${limits.maxPlannerGenerationsPerDay}`
    : "Unlimited";

  return (
    <div className="page">
      <p className="sans quota">Welcome{user ? `, ${user.email}` : ""}</p>
      <h1>Your guidance workspace</h1>
      <p className="lede">
        Start with a photo preference profile, then generate a destination shot list. MusePilot is a
        guidance assistant — not a camera replacement.
      </p>
      <p className="quota">
        Free plan: {solo}/{limits.maxSoloProfiles} solo profile · Planner today {daily}
        {isProTier(user?.tier ?? "free") ? " · Pro" : ""}
      </p>
      <div className="grid-3" style={{ marginTop: 24 }}>
        <Link className="card" to="/app/profiles" style={{ textDecoration: "none" }}>
          <h3>Profiles</h3>
          <p>How you like to be photographed. Stored on this device by default.</p>
        </Link>
        <Link className="card" to="/app/plans" style={{ textDecoration: "none" }}>
          <h3>Shot Plans</h3>
          <p>Pre-shoot lists for beach, city, forest, or cafe.</p>
        </Link>
        <Link className="card" to="/app/cards" style={{ textDecoration: "none" }}>
          <h3>Shared Cards</h3>
          <p>Read-only pages for the person holding the camera. Pro only.</p>
        </Link>
      </div>
      {solo === 0 && (
        <div className="banner" style={{ marginTop: 20 }}>
          New here? Create your first single-person profile — it takes about a minute.
          <div className="actions">
            <Link className="btn btn-primary" to="/app/profiles/new/solo?onboarding=1">
              Create a profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
