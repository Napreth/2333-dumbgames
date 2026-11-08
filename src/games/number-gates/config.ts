export const RUN = {
  mergeBase: 8n,
  trackWidth: 8.4,
  laneX: 2.1,
  maxX: 2.9,
  forwardSpeed: 8.2,
  lateralSpeed: 7,
  steering: 12,
  step: 1 / 120,
  firstGate: 28,
  minGap: 17,
  maxGap: 21,
  combatGap: 16,
  afterCombatGap: 19,
  contactRange: 8.2,
  renderAhead: 104,
  battleCenterWeight: 0.75,
  battleTicks: 16,
  visibleUnits: 60,
  mobileUnits: 36,
} as const

export const INITIAL_POWER = 8n

export const ECONOMY = {
  additiveFamilyProbability: 0.75,
  positiveAdditiveProbability: 0.6,
  positiveMultiplicativeProbability: 0.2,
  normalAdditiveRate: 0.03,
  rareAdditiveProbability: 0.03,
  rareAdditiveRate: 0.35,
  randomShape: 0.7,
  normalRandomRange: 8,
  rareRandomRange: 4,
  multiplyWeights: [[2, 80], [3, 12], [4, 5], [5, 1], [6, 0.8], [8, 0.6], [10, 0.4], [20, 0.2]],
  divideWeights: [[2, 95], [3, 2], [4, 0.625], [5, 0.625], [6, 0.625], [8, 0.625], [10, 0.25], [20, 0.25]],
  enemyMinRatio: 0.2,
  enemyMaxRatio: 0.8,
  pairAttempts: 64,
} as const

export const COMBAT = {
  bossEvery: 5,
  bands: [
    { through: 60, min: 12, max: 16 },
    { through: 150, min: 10, max: 13 },
    { through: 300, min: 8, max: 11 },
    { through: Infinity, min: 7, max: 9 },
  ],
  timing: {
    normal: { approach: 0.9, contact: 2.36, duration: 2.95 },
    boss: { approach: 1.22, contact: 3.46, duration: 4.35 },
  },
} as const

export const tiers = [
  { name: '普通小人', color: 0x29c9e9, trim: 0xd7fdff, size: 0.68 },
  { name: '大个子', color: 0x4165ec, trim: 0x99f6ff, size: 0.85 },
  { name: '轻甲兵', color: 0x23ae91, trim: 0xc0ffc8, size: 0.91 },
  { name: '重甲兵', color: 0x6c6bea, trim: 0xddd6ff, size: 1 },
  { name: '盾卫', color: 0x237fa7, trim: 0x84fcf1, size: 1.06 },
  { name: '骑士', color: 0x5942bd, trim: 0xffda78, size: 1.13 },
  { name: '机甲兵', color: 0x19518a, trim: 0x8afaff, size: 1.24 },
  { name: '巨人', color: 0x8c4bba, trim: 0xffbfeb, size: 1.36 },
] as const
