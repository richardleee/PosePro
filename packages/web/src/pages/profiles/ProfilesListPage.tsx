import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteProfile, listProfiles } from "../../storage/db";
import type { LocalProfile } from "../../types";
import { useAuth } from "../../lib/auth";
import { effectiveLimits, isProTier } from "@framecoach/shared";
import { ConfirmModal, UpgradeModal } from "../../components/Modals";

export function ProfilesListPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<LocalProfile[]>([]);
  const [upgrade, setUpgrade] = useState(false);
  const [del, setDel] = useState<LocalProfile | null>(null);

  const limits = effectiveLimits(user?.tier ?? "free");
  const solo = rows.filter((r) => r.kind === "solo").length;
  const couple = rows.filter((r) => r.kind === "couple").length;
  const canSolo = solo < limits.maxSoloProfiles;
  const canCouple = couple < limits.maxCoupleProfiles;

  async function load() {
    setRows(await listProfiles());
  }
  useEffect(() => {
    load();
  }, []);

  function newProfile(kind: "solo" | "couple") {
    if (kind === "solo" && !canSolo) return setUpgrade(true);
    if (kind === "couple" && !canCouple) return setUpgrade(true);
    nav(`/app/profiles/new/${kind}`);
  }

  return (
    <div className="page">
      <div className="row-between">
        <h1>Your Photo Profiles</h1>
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="btn btn-primary" type="button" disabled={!canSolo} onClick={() => newProfile("solo")}>
            + New Profile · Single
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!canCouple}
            onClick={() => newProfile("couple")}
          >
            + Couple
          </button>
        </div>
      </div>
      <p className="quota">
        {solo}/{limits.maxSoloProfiles} solo · {couple}/{limits.maxCoupleProfiles} couple
        {!isProTier(user?.tier ?? "free") && " · Couple profiles require Pro"}
      </p>
      <div className="grid-2" style={{ marginTop: 20 }}>
        {rows.map((p) => (
          <article className="card" key={p.id}>
            <h3>{p.name}</h3>
            <p>
              {p.kind === "couple" ? "Couple" : "Single"} · {p.aesthetic.join(", ") || "No style tags"}
            </p>
            <div className="actions">
              <Link className="btn btn-secondary" to={`/app/profiles/${p.id}`}>
                Edit
              </Link>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  if (p.kind === "solo" && !canSolo) return setUpgrade(true);
                  if (p.kind === "couple" && !canCouple) return setUpgrade(true);
                  nav(`/app/profiles/new/${p.kind}?duplicate=${p.id}`);
                }}
              >
                Duplicate
              </button>
              <button className="btn btn-tertiary" type="button" onClick={() => setDel(p)}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p>No profiles yet.</p>}
      </div>
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
      {del && (
        <ConfirmModal
          title="Delete this profile?"
          body="This removes it from this browser. Cloud copies are only removed if backup is on."
          confirmLabel="Delete"
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            await deleteProfile(del.id);
            setDel(null);
            load();
          }}
        />
      )}
    </div>
  );
}
