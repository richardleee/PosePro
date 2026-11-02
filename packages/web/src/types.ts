import type {
  AestheticTag,
  BodyTypeTag,
  CompositionTag,
  DislikeTag,
  PlanTier,
  ProfileKind,
  SceneTag,
  ShotTemplate,
} from "@framecoach/shared";

export interface LocalProfile {
  id: string;
  kind: ProfileKind;
  name: string;
  heightCm?: number;
  notes: string;
  bodyTypes: BodyTypeTag[];
  aesthetic: AestheticTag[];
  composition: CompositionTag[];
  dislikes: DislikeTag[];
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LocalPlan {
  id: string;
  destination: string;
  scene: SceneTag;
  profileId: string;
  referenceName?: string;
  shots: ShotTemplate[];
  createdAt: number;
}

export interface LocalShareCard {
  id: string;
  url: string;
  planId: string;
  revoked: boolean;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  tier: PlanTier;
}

export interface AppSettings {
  key: "settings";
  cloudSyncEnabled: boolean;
  cloudSyncConfirmedAt?: number;
}
