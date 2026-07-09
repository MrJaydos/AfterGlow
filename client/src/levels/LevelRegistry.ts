import type { LevelDef } from './types';
import { LEVEL1_META, buildLevel1 } from './Level1';
import { LEVEL2_META, buildLevel2 } from './Level2';
import { LEVEL3_META, buildLevel3 } from './Level3';

export const LEVEL_REGISTRY: Record<string, LevelDef> = {
  [LEVEL1_META.levelId]: { meta: LEVEL1_META, build: buildLevel1 },
  [LEVEL2_META.levelId]: { meta: LEVEL2_META, build: buildLevel2 },
  [LEVEL3_META.levelId]: { meta: LEVEL3_META, build: buildLevel3 },
};

export const DEFAULT_LEVEL_ID = LEVEL1_META.levelId;
