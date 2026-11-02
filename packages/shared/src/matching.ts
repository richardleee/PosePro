import type { ShotTemplate, SceneTag, ProfileTags } from "./types.js";
import { POSE_LIBRARY } from "./poseLibrary.js";

function overlap<T>(a: T[], b: T[]): number {
  const set = new Set(a);
  return b.reduce((n, x) => n + (set.has(x) ? 1 : 0), 0);
}

export function matchShots(input: {
  scene: SceneTag;
  tags: ProfileTags;
  couple: boolean;
}): ShotTemplate[] {
  const scored = POSE_LIBRARY.filter((t) => t.scene === input.scene)
    .map((t) => {
      if (t.tags.some((tag) => input.tags.dislikes.includes(tag as never))) {
        return { t, score: -1 };
      }
      let score = 1;
      score += overlap(t.aesthetic, input.tags.aesthetic) * 3;
      score += overlap(t.composition, input.tags.composition) * 3;
      score += overlap(t.bodyTypes, input.tags.bodyTypes) * 1;
      if (input.couple !== t.couple) score -= 5;
      return { t, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  const count = Math.min(5, Math.max(3, scored.length));
  return scored.slice(0, count).map((x) => x.t);
}
