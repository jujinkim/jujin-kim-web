// Run with: node --test tests/evolution.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { GENOMES, GENE_COUNT, GENES } from '../js/modules/config.js';
import { seedPopulation, evolve, decode, diversity, restore, serialize, DIVERSITY_FLOOR } from '../js/modules/evolution.js';

// Deterministic generator so failures reproduce.
function seeded(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

const inBounds = (genomes) => genomes.every((g) => g.length === GENE_COUNT && g.every((v) => v >= 0 && v <= 1));

test('a seeded population is complete, bounded and diverse', () => {
    const genomes = seedPopulation(seeded(1));
    assert.equal(genomes.length, GENOMES);
    assert.ok(inBounds(genomes));
    assert.ok(diversity(genomes) > DIVERSITY_FLOOR);
});

test('decoded genes stay inside their declared ranges', () => {
    const decoded = decode(seedPopulation(seeded(2)));
    for (let g = 0; g < GENOMES; g++)
        for (let k = 0; k < GENE_COUNT; k++) {
            const v = decoded[g * GENE_COUNT + k];
            assert.ok(v >= GENES[k].min - 1e-6 && v <= GENES[k].max + 1e-6, `${GENES[k].name} = ${v}`);
        }
});

test('the fittest genomes survive a generation unchanged, the weakest are replaced', () => {
    const random = seeded(3);
    const genomes = seedPopulation(random);
    const fitness = genomes.map((_, i) => i);
    const result = evolve(genomes, fitness, random);
    for (const slot of [23, 22, 21, 20]) assert.deepEqual(result.genomes[slot], genomes[slot]);
    for (const slot of [12, 13, 19]) assert.deepEqual(result.genomes[slot], genomes[slot], 'middle ranks keep their slot');
    let changed = 0;
    for (let slot = 0; slot < 12; slot++) if (result.genomes[slot].some((v, k) => v !== genomes[slot][k])) changed++;
    assert.equal(changed, 12);
    assert.ok(inBounds(result.genomes));
    assert.deepEqual(genomes, seedPopulation(seeded(3)), 'input population is not mutated');
});

test('selection moves the population toward what fitness rewards', () => {
    const random = seeded(4);
    let genomes = seedPopulation(random);
    const mean = (pop) => pop.reduce((sum, g) => sum + g[0], 0) / pop.length;
    const before = mean(genomes);
    for (let i = 0; i < 40; i++) genomes = evolve(genomes, genomes.map((g) => g[0]), random).genomes;
    assert.ok(mean(genomes) > before + 0.2, `speed gene ${before.toFixed(2)} -> ${mean(genomes).toFixed(2)}`);
});

test('a collapsed population gets immigrants and never stays collapsed', () => {
    const random = seeded(5);
    const clone = Array.from({ length: GENOMES }, () => Array(GENE_COUNT).fill(0.5));
    const result = evolve(clone, new Array(GENOMES).fill(1), random);
    assert.equal(result.lowDiversity, true);
    assert.ok(diversity(result.genomes) > diversity(clone));
    let genomes = result.genomes;
    for (let i = 0; i < 30; i++) genomes = evolve(genomes, genomes.map(() => random()), random).genomes;
    assert.ok(diversity(genomes) > DIVERSITY_FLOOR * 0.5);
    assert.ok(inBounds(genomes));
});

test('a saved lineage round-trips', () => {
    const genomes = seedPopulation(seeded(6));
    const back = restore(serialize(412, genomes));
    assert.equal(back.restored, true);
    assert.equal(back.gen, 412);
    assert.equal(back.genomes.length, GENOMES);
    for (let g = 0; g < GENOMES; g++)
        for (let k = 0; k < GENE_COUNT; k++) assert.ok(Math.abs(back.genomes[g][k] - genomes[g][k]) <= 0.0005);
});

test('corrupt saved state falls back to a fresh lineage', () => {
    const bad = [
        null,
        '',
        'not json',
        '{"v":2,"gen":3,"genomes":[]}',
        JSON.stringify({ v: 1, gen: 3, genomes: [[1, 2, 3]] }),
        JSON.stringify({ v: 1, gen: -1, genomes: seedPopulation(seeded(7)) }),
        JSON.stringify({ v: 1, gen: 3, genomes: seedPopulation(seeded(7)).map((g) => g.map(() => null)) })
    ];
    for (const raw of bad) {
        const state = restore(raw, seeded(8));
        assert.equal(state.restored, false, String(raw).slice(0, 40));
        assert.equal(state.gen, 0);
        assert.ok(inBounds(state.genomes));
    }
});

test('out-of-range and collapsed saved genomes are repaired', () => {
    const wild = seedPopulation(seeded(9)).map((g) => g.map((v, k) => (k === 0 ? 7 : v)));
    assert.ok(inBounds(restore(JSON.stringify({ v: 1, gen: 5, genomes: wild })).genomes));
    const flat = Array.from({ length: GENOMES }, () => Array(GENE_COUNT).fill(0.3));
    const state = restore(JSON.stringify({ v: 1, gen: 9, genomes: flat }), seeded(10));
    assert.equal(state.gen, 9);
    assert.ok(diversity(state.genomes) > diversity(flat));
});
