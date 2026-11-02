import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AESTHETICS,
  BODY_TYPES,
  COMPOSITIONS,
  DISLIKES,
  effectiveLimits,
  type AestheticTag,
  type BodyTypeTag,
  type CompositionTag,
  type DislikeTag,
} from "@framecoach/shared";
import { getProfile, listProfiles, putProfile } from "../../storage/db";
import type { LocalProfile } from "../../types";
import { useAuth } from "../../lib/auth";
import { UpgradeModal } from "../../components/Modals";
import { track } from "../../lib/session";

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            className={`chip ${on ? "on" : ""}`}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileEditPage() {
  const { id, kind: kindParam } = useParams();
  const [qs] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [kind, setKind] = useState<"solo" | "couple">(kindParam === "couple" ? "couple" : "solo");
  const [name, setName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyTypes, setBodyTypes] = useState<BodyTypeTag[]>([]);
  const [aesthetic, setAesthetic] = useState<AestheticTag[]>([]);
  const [composition, setComposition] = useState<CompositionTag[]>([]);
  const [dislikes, setDislikes] = useState<DislikeTag[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [solos, setSolos] = useState<LocalProfile[]>([]);
  const [upgrade, setUpgrade] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await listProfiles();
      setSolos(all.filter((p) => p.kind === "solo"));
      const dup = qs.get("duplicate");
      const loadId = id && id !== "new" ? id : dup;
      if (loadId) {
        const p = await getProfile(loadId);
        if (p) {
          setKind(p.kind);
          setName(dup ? `${p.name} copy` : p.name);
          setHeightCm(p.heightCm ? String(p.heightCm) : "");
          setNotes(p.notes);
          setBodyTypes(p.bodyTypes);
          setAesthetic(p.aesthetic);
          setComposition(p.composition);
          setDislikes(p.dislikes);
          setMemberIds(p.memberIds);
        }
      }
      setReady(true);
    })();
  }, [id, qs]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const all = await listProfiles();
    const limits = effectiveLimits(user?.tier ?? "free");
    const editing = Boolean(id && id !== "new" && !qs.get("duplicate"));
    const nextKind = kind;
    if (!editing) {
      const soloCount = all.filter((p) => p.kind === "solo").length;
      const coupleCount = all.filter((p) => p.kind === "couple").length;
      if (nextKind === "solo" && soloCount >= limits.maxSoloProfiles) return setUpgrade(true);
      if (nextKind === "couple" && coupleCount >= limits.maxCoupleProfiles) return setUpgrade(true);
    }
    if (nextKind === "couple" && memberIds.length !== 2) {
      alert("Choose two existing single profiles for a couple profile.");
      return;
    }
    const record: LocalProfile = {
      id: editing && id ? id : crypto.randomUUID(),
      kind: nextKind,
      name,
      heightCm: heightCm ? Number(heightCm) : undefined,
      notes,
      bodyTypes,
      aesthetic,
      composition,
      dislikes,
      memberIds: nextKind === "couple" ? memberIds : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (editing && id) {
      const prev = await getProfile(id);
      if (prev) record.createdAt = prev.createdAt;
    }
    await putProfile(record);
    track("profile_saved", { kind: nextKind });
    nav("/app/profiles");
  }

  if (!ready) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <Link className="btn btn-tertiary" to="/app/profiles">
        Back
      </Link>
      <h1>{kind === "couple" ? "Couple profile" : "Single profile"}</h1>
      {qs.get("onboarding") && (
        <p className="banner">This stays on your device unless you later turn on encrypted cloud backup.</p>
      )}
      <form className="form-grid card" onSubmit={onSubmit}>
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {kind !== "couple" && (
          <label>
            Height (cm)
            <input type="number" min={80} max={230} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </label>
        )}
        {kind === "couple" && (
          <label>
            Two existing people
            <select
              multiple
              size={Math.max(2, solos.length)}
              value={memberIds}
              onChange={(e) =>
                setMemberIds(Array.from(e.target.selectedOptions).map((o) => o.value).slice(0, 2))
              }
            >
              {solos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind !== "couple" && (
          <div>
            <p>Body type</p>
            <ChipGroup options={BODY_TYPES} value={bodyTypes} onChange={setBodyTypes} />
          </div>
        )}
        <div>
          <p>Preferred aesthetic</p>
          <ChipGroup options={AESTHETICS} value={aesthetic} onChange={setAesthetic} />
        </div>
        <div>
          <p>Preferred composition</p>
          <ChipGroup options={COMPOSITIONS} value={composition} onChange={setComposition} />
        </div>
        <div>
          <p>Dislikes</p>
          <ChipGroup options={DISLIKES} value={dislikes} onChange={setDislikes} />
        </div>
        <label>
          Notes
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn btn-tertiary" to="/app/profiles">
            Cancel
          </Link>
        </div>
      </form>
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
    </div>
  );
}
