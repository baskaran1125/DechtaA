export const COMMISSION = 0.10;
export const COMMISSION_LIMIT = 300;
export const MAX_SKILLS = 3;
export const FILE_SIZE_LIMIT = 2097152;

export const SKILL_CATEGORIES: Record<string, string[]> = {
  'All Works': [
    'Carpenter',
    'Mason',
    'Plumbing',
    'Tiles Laying',
    'Fence Work',
    'Fabricator / Welder',
    'Electrical',
    'False Ceiling',
    'Gardening',
    'AAC Panel Work'
  ]
};

export const JOB_CATEGORY_BREAKDOWN: Record<string, number> = {
  'Morning (9a-12p)': 0,
  'Noon (12p-4p)': 0,
  'Evening (4p-8p)': 0,
  'Night (8p-12a)': 0
};

export const PIE_COLORS: Record<string, string> = {
  'Morning (9a-12p)': '#3b82f6',
  'Noon (12p-4p)': '#ef4444',
  'Evening (4p-8p)': '#f97316',
  'Night (8p-12a)': '#a855f7'
};

export const LEVEL_THRESHOLDS: Record<string, number> = {
  Bronze: 0,
  Silver: 100,
  Gold: 300,
  Platinum: 700,
  Max: 1200
};
