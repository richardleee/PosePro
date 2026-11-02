import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SCENES, effectiveLimits, matchShots, type SceneTag } from "@framecoach/shared";
import { bumpPlannerUsage, getTodayUsage, listProfiles, putPlan } from "../../storage/db";
import type { LocalProfile } from "../../types";
import { useAuth } from "../../lib/auth";
import { UpgradeModal } from "../../components/Modals";
import { api, track } from "../../lib/session";
import type { ShotTemplate } from "@framecoach/shared";

export function ShotPlanWizardPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [scene, setScene] = useState<SceneTag>("beach");
  const [refName, setRefName] = useState("");
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    listProfiles().then((p) => {
      setProfiles(p);
      if (p[0]) setProfileId(p[0].id);
    });
  }, []);

  async function generate(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const limits = effectiveLimits(user?.tier ?? "free");
    const used = await getTodayUsage();
    if (used >= limits.maxPlannerGenerationsPerDay) {
      setUpgrade(true);
      return;
    }
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return setErr("Select a profile");

    let shots: ShotTemplate[] = [];
    try {
      const data = await api<{ shots: ShotTemplate[] }>("/api/plans/generate", {
        method: "POST",
        body: JSON.stringify({
          scene,
          couple: profile.kind === "couple",
          tags: {
            bodyTypes: profile.bodyTypes,
            aesthetic: profile.aesthetic,
            composition: profile.composition,
            dislikes: profile.dislikes,
          },
        }),
      });
      shots = data.shots;
      await bumpPlannerUsage();
    } catch (e2) {
      const err2 = e2 as Error & { code?: string };
      if (err2.code === "upgrade_required") {
        setUpgrade(true);
        return;
      }
      shots = matchShots({
        scene,
        couple: profile.kind === "couple",
        tags: {
          bodyTypes: profile.bodyTypes,
          aesthetic: profile.aesthetic,
          composition: profile.composition,
          dislikes: profile.dislikes,
        },
      });
      await bumpPlannerUsage();
    }

    const id = crypto.randomUUID();
    await putPlan({
      id,
      destination,
      scene,
      profileId,
      referenceName: refName || undefined,
      shots,
      createdAt: Date.now(),
    });
    track("planner_generated", { scene });
    nav(`/app/plans/${id}`);
  }

  return (
    <div className="page">
      <Link className="btn btn-tertiary" to="/app/plans">
        Back
      </Link>
      <h1>Create a shot plan</h1>
      <p className="steps">
        <span className={step === 1 ? "on" : ""}>1 Destination</span>
        <span className={step === 2 ? "on" : ""}>2 Profile</span>
        <span className={step === 3 ? "on" : ""}>3 Generate</span>
      </p>
      {step === 1 && (
        <form
          className="form-grid card"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <label>
            Destination name
            <input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Lisbon, Bondi, Kyoto…" />
          </label>
          <label>
            Scene
            <select value={scene} onChange={(e) => setScene(e.target.value as SceneTag)}>
              {SCENES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Optional reference photo (stays on this device — never uploaded)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setRefName(e.target.files?.[0]?.name || "")}
            />
          </label>
          {refName && <p className="quota">Attached locally: {refName}</p>}
          <button className="btn btn-primary" type="submit">
            Continue
          </button>
        </form>
      )}
      {step === 2 && (
        <form
          className="form-grid card"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
        >
          <label>
            Person / couple profile
            <select required value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.kind})
                </option>
              ))}
            </select>
          </label>
          {profiles.length === 0 && (
            <p>
              Create a profile first. <Link to="/app/profiles/new/solo">New profile</Link>
            </p>
          )}
          <div className="actions">
            <button className="btn btn-tertiary" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" type="submit" disabled={!profileId}>
              Continue
            </button>
          </div>
        </form>
      )}
      {step === 3 && (
        <form className="card form-grid" onSubmit={generate}>
          <p>
            Generate 3–5 setups for <strong>{destination}</strong> ({scene}). Matching uses your preference
            tags — not a live image model.
          </p>
          {err && <p className="quota">{err}</p>}
          <div className="actions">
            <button className="btn btn-tertiary" type="button" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn btn-primary" type="submit">
              Generate
            </button>
          </div>
        </form>
      )}
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
    </div>
  );
}
