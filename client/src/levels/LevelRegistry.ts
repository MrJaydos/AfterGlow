import type { LevelDef } from './types';
import { LEVEL1_META, buildLevel1 } from './Level1';

export const LEVEL_REGISTRY: Record<string, LevelDef> = {
  [LEVEL1_META.levelId]: { meta: LEVEL1_META, build: buildLevel1 },
};

export const DEFAULT_LEVEL_ID = LEVEL1_META.levelId;
