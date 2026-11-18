// Every number that shapes how the swarm feels lives here.

export const GENOMES = 24;
export const GENE_COUNT = 8;

// Decoded range per gene; genomes are stored normalized to [0, 1].
export const GENES = [
    { name: 'speed', min: 40, max: 220 },
    { name: 'turn', min: 0.6, max: 6.0 },
    { name: 'attract', min: 0.15, max: 1.0 },
    { name: 'orbit', min: 20, max: 260 },
    { name: 'cohesion', min: 0, max: 1 },
    { name: 'wander', min: 0.05, max: 1.0 },
    { name: 'flee', min: 0, max: 1 },
    { name: 'hue', min: 0, max: 0.75 }
];

// Generation 0 is seeded around this genome so the first frame already looks right.
export const SEED_GENOME = [0.42, 0.5, 0.55, 0.4, 0.35, 0.55, 0.3, 0.5];

export const COUNT_LADDER = {
    fine: [16000, 12000, 8000, 5000],
    coarse: [7000, 5000, 3000]
};

export const PIXEL_BUDGET = { fine: 3.0e6, coarse: 1.5e6 };

// Ramp positions 0, .25, .5, .75, 1. Genomes may only reach 0.75; the last
// stop (ember) is reserved for the pulse ring and particles it has struck.
export const RAMP = [
    [0.74, 0.22, 0.98],
    [0.16, 0.38, 1.0],
    [0.1, 0.9, 0.9],
    [0.42, 1.0, 0.52],
    [1.0, 0.56, 0.24]
];

export const GROUND = [5 / 255, 6 / 255, 10 / 255];

export const TUNING = {
    // light
    lightFollow: 10,
    lightReach: 0.34,
    attractK: 430,
    swirlK: 180,
    ghostAfterMs: 3500,
    // flock
    alignK: 0.7,
    wakeK: 3.6,
    wakeTau: 1.5,
    wakeSplat: 0.55,
    cohesionK: 46,
    densityCap: 3.2,
    separationK: 150,
    wanderK: 290,
    noiseScale: 0.0042,
    turnK: 130,
    speedRelax: 2.2,
    wrapMargin: 28,
    // text targets
    springK: 56,
    springDamp: 10.5,
    targetOrbit: 1.4,
    // pulse
    pulseRise: 0.35,
    pulseLethal: 0.9,
    pulseLife: 2.4,
    pulseMin: 0.18,
    pulseMax: 0.6,
    pulseChargeMs: 1100,
    fleeK: 1100,
    fleeRange: 170,
    respawnTime: 2.0,
    respawnFlight: 0.45,
    // states
    idleCondenseMs: 1200,
    wakeEnergy: 150,
    condenseShare: 0.65,
    condenseIn: 2.4,
    condenseOut: 5,
    dormantCount: 600,
    wakeSeconds: 1.6,
    transitSeconds: 1.5,
    autoWakeMs: 10000,
    hintMs: 2500,
    revealMs: 400,
    revealFailsafeMs: 6000,
    contentLight: 0.3,
    // evolution
    fitnessSigma: 0.18,
    generationSeconds: 6,
    paramBlend: 1.5,
    // render
    deposit: 2.0,
    trailTau: 1.7,
    trailTauCondensed: 0.4,
    bleed: 0.12,
    exposure: 2.6,
    bloomNear: 0.85,
    bloomFar: 1.0,
    breathHz: 0.1,
    breathDepth: 0.2,
    // colour: how far a lineage's hue swings across the field, and how much
    // fast particles lean toward the bright end
    hueWave: 0.2,
    hueSpeed: 0.1,
    whiteAt: 9.0,
    glow: 2.4,
    ringGlow: 0.75,
    boundDim: 0.35,
    shade: 0.86,
    shadeFeather: 240,
    pointMin: 1.5,
    pointMax: 6.5
};

export const SECTIONS = ['home', 'work', 'projects', 'lab', 'about'];
export const LEGACY_HASHES = { technologies: 'about' };

export const STORAGE_KEY = 'swarm.v1';
export const ENTERED_KEY = 'swarm.entered';
