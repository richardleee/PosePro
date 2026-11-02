export type SceneTag = "beach" | "city" | "forest" | "cafe";

export type BodyTypeTag =
  | "petite"
  | "athletic"
  | "curvy"
  | "tall"
  | "plus-size"
  | "average";

export type AestheticTag =
  | "natural"
  | "editorial"
  | "candid"
  | "romantic"
  | "minimal"
  | "warm-film";

export type CompositionTag =
  | "rule-of-thirds"
  | "centered"
  | "frame-in-frame"
  | "leading-lines"
  | "negative-space"
  | "close-up";

export type DislikeTag =
  | "low-angle"
  | "wide-angle-face"
  | "lying-down"
  | "hands-on-hips"
  | "back-to-camera"
  | "direct-flash";

export type ProfileKind = "solo" | "couple";

export type PlanTier = "free" | "trialing" | "pro";

export interface ProfileTags {
  bodyTypes: BodyTypeTag[];
  aesthetic: AestheticTag[];
  composition: CompositionTag[];
  dislikes: DislikeTag[];
}

export interface ShotTemplate {
  id: string;
  scene: SceneTag;
  couple: boolean;
  compositionName: string;
  compositionKey: CompositionTag;
  wireframe: string;
  posePrompt: string;
  photographerTip: string;
  aesthetic: AestheticTag[];
  composition: CompositionTag[];
  bodyTypes: BodyTypeTag[];
  tags: string[];
}

export const SCENES: { id: SceneTag; label: string }[] = [
  { id: "beach", label: "Beach" },
  { id: "city", label: "City" },
  { id: "forest", label: "Forest" },
  { id: "cafe", label: "Cafe" },
];

export const BODY_TYPES: { id: BodyTypeTag; label: string }[] = [
  { id: "petite", label: "Petite" },
  { id: "athletic", label: "Athletic" },
  { id: "curvy", label: "Curvy" },
  { id: "tall", label: "Tall" },
  { id: "plus-size", label: "Plus size" },
  { id: "average", label: "Average" },
];

export const AESTHETICS: { id: AestheticTag; label: string }[] = [
  { id: "natural", label: "Natural" },
  { id: "editorial", label: "Editorial" },
  { id: "candid", label: "Candid" },
  { id: "romantic", label: "Romantic" },
  { id: "minimal", label: "Minimal" },
  { id: "warm-film", label: "Warm film" },
];

export const COMPOSITIONS: { id: CompositionTag; label: string }[] = [
  { id: "rule-of-thirds", label: "Rule of thirds" },
  { id: "centered", label: "Centered" },
  { id: "frame-in-frame", label: "Frame in frame" },
  { id: "leading-lines", label: "Leading lines" },
  { id: "negative-space", label: "Negative space" },
  { id: "close-up", label: "Close-up" },
];

export const DISLIKES: { id: DislikeTag; label: string }[] = [
  { id: "low-angle", label: "Low angle" },
  { id: "wide-angle-face", label: "Wide-angle on face" },
  { id: "lying-down", label: "Lying down" },
  { id: "hands-on-hips", label: "Hands on hips" },
  { id: "back-to-camera", label: "Back to camera" },
  { id: "direct-flash", label: "Direct flash" },
];
