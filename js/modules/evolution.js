import { GENOMES, GENE_COUNT, GENES, SEED_GENOME, STORAGE_KEY } from './config.js?v=20261119.11';

// Pure genetic algorithm over GENOMES genomes of GENE_COUNT normalized genes.
// No DOM or rendering here, so it runs under node for tests.

const ELITES = 4;
const REPLACED = 12;
const PARENT_POOL = 12;
const TOURNAMENT = 3;
const BLX_ALPHA = 0.3;
const MUTATION_RATE = 0.25;
const MUTATION_SIGMA = 0.12;
const HUE_SIGMA = 0.1;
const HUE_GENE = GENE_COUNT - 1;
export const DIVERSITY_FLOOR = 0.08;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function gaussian(random) {
    let u = 0;
    while (u === 0) u = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function randomGenome(random) {
    return Array.from({ length: GENE_COUNT }, () => random());
}

export function seedPopulation(random = Math.random) {
    return Array.from({ length: GENOMES }, () =>
        SEED_GENOME.map((v, k) => clamp01(v + (random() * 2 - 1) * (k === HUE_GENE ? 0.5 : 0.2)))
    );
}

// Mean per-gene standard deviation across the population.
export function diversity(genomes) {
    let total = 0;
    for (let k = 0; k < GENE_COUNT; k++) {
        let mean = 0;
        for (const g of genomes) mean += g[k];
        mean /= genomes.length;
        let variance = 0;
        for (const g of genomes) variance += (g[k] - mean) ** 2;
        total += Math.sqrt(variance / genomes.length);
    }
    return total / GENE_COUNT;
}

// Writes decoded (real-unit) parameters into a flat Float32Array.
export function decode(genomes, out = new Float32Array(GENOMES * GENE_COUNT)) {
    for (let g = 0; g < GENOMES; g++)
        for (let k = 0; k < GENE_COUNT; k++)
            out[g * GENE_COUNT + k] = GENES[k].min + (GENES[k].max - GENES[k].min) * genomes[g][k];
    return out;
}

// One generation. Returns a new population; genomes keep their slot when they
// survive, so a particle's lineage stays put unless its genome was replaced.
export function evolve(genomes, fitness, random = Math.random) {
    const order = genomes.map((_, i) => i).sort((a, b) => fitness[b] - fitness[a]);
    const next = genomes.map((g) => g.slice());
    const lowDiversity = diversity(genomes) < DIVERSITY_FLOOR;
    const sigmaScale = lowDiversity ? 2 : 1;
    const pool = order.slice(0, PARENT_POOL);

    const pick = () => {
        let best = pool[(random() * pool.length) | 0];
        for (let t = 1; t < TOURNAMENT; t++) {
            const other = pool[(random() * pool.length) | 0];
            if (fitness[other] > fitness[best]) best = other;
        }
        return genomes[best];
    };

    for (const slot of order.slice(GENOMES - REPLACED)) {
        const a = pick();
        const b = pick();
        next[slot] = a.map((av, k) => {
            const lo = Math.min(av, b[k]);
            const hi = Math.max(av, b[k]);
            const span = hi - lo;
            let v = lo - span * BLX_ALPHA + random() * span * (1 + 2 * BLX_ALPHA);
            if (random() < MUTATION_RATE)
                v += gaussian(random) * (k === HUE_GENE ? HUE_SIGMA : MUTATION_SIGMA) * sigmaScale;
            return clamp01(v);
        });
    }
    if (lowDiversity) for (const slot of order.slice(-2)) next[slot] = randomGenome(random);
    return { genomes: next, order, elites: order.slice(0, ELITES), lowDiversity };
}

function valid(genomes) {
    return (
        Array.isArray(genomes) &&
        genomes.length === GENOMES &&
        genomes.every(
            (g) => Array.isArray(g) && g.length === GENE_COUNT && g.every((v) => typeof v === 'number' && isFinite(v))
        )
    );
}

// Accepts whatever was persisted and always returns a usable lineage.
export function restore(raw, random = Math.random) {
    try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || data.v !== 1 || !valid(data.genomes) || !Number.isFinite(data.gen) || data.gen < 0)
            throw new Error('invalid');
        const genomes = data.genomes.map((g) => g.map(clamp01));
        if (diversity(genomes) < DIVERSITY_FLOOR) {
            const fresh = seedPopulation(random);
            for (let i = 0; i < GENOMES; i += 2) genomes[i] = fresh[i];
        }
        return { gen: Math.floor(data.gen), genomes, restored: true };
    } catch {
        return { gen: 0, genomes: seedPopulation(random), restored: false };
    }
}

export function serialize(gen, genomes) {
    return JSON.stringify({
        v: 1,
        gen,
        genomes: genomes.map((g) => g.map((v) => Math.round(v * 1000) / 1000)),
        t: Date.now()
    });
}

export function loadState() {
    let raw = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
    return restore(raw);
}

export function saveState(gen, genomes) {
    try {
        localStorage.setItem(STORAGE_KEY, serialize(gen, genomes));
    } catch {}
}

export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}
}
