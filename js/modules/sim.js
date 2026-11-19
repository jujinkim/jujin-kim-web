import { TUNING as T, GENOMES, GENE_COUNT } from './config.js?v=20261119.11';

const MAX_PULSES = 4;
const TAU = Math.PI * 2;

// Particle state lives in flat typed arrays sized once for the largest tier.
// Nothing in step() allocates.
export function createSim(maxN) {
    const px = new Float32Array(maxN);
    const py = new Float32Array(maxN);
    const vx = new Float32Array(maxN);
    const vy = new Float32Array(maxN);
    const tx = new Float32Array(maxN);
    const ty = new Float32Array(maxN);
    const phase = new Float32Array(maxN);
    const stiff = new Float32Array(maxN);
    const respawn = new Float32Array(maxN);
    const gene = new Uint8Array(maxN);
    const bound = new Uint8Array(maxN);
    const render = new Float32Array(maxN * 4);

    const params = new Float32Array(GENOMES * GENE_COUNT);
    const paramsFrom = new Float32Array(GENOMES * GENE_COUNT);
    const paramsTo = new Float32Array(GENOMES * GENE_COUNT);
    let blend = 1;

    const fitSum = new Float32Array(GENOMES);
    const caught = new Float32Array(GENOMES);
    let activeTime = 0;
    let caughtTotal = 0;

    const pulses = [];
    for (let i = 0; i < MAX_PULSES; i++) pulses.push({ x: 0, y: 0, t: 0, rmax: 0, r: 0, prev: 0, live: false });

    let n = maxN;
    let w = 0;
    let h = 0;
    let scale = 1;
    let time = 0;
    let cell = 16;
    let gw = 1;
    let gh = 1;
    let stride = 3;
    let gCount = new Float32Array(9);
    let gVx = new Float32Array(9);
    let gVy = new Float32Array(9);
    let wakeVx = new Float32Array(9);
    let wakeVy = new Float32Array(9);
    let lastLx = 0;
    let lastLy = 0;

    for (let i = 0; i < maxN; i++) {
        phase[i] = Math.random() * TAU;
        stiff[i] = 0.55 + Math.random() * 0.9;
        gene[i] = i % GENOMES;
    }

    function resize(nw, nh) {
        const first = w === 0;
        const sx = first ? 1 : nw / w;
        const sy = first ? 1 : nh / h;
        w = nw;
        h = nh;
        scale = Math.min(w, h) / 900;
        cell = Math.max(w, h) / 64;
        gw = Math.max(1, Math.ceil(w / cell));
        gh = Math.max(1, Math.ceil(h / cell));
        stride = gw + 2;
        const size = stride * (gh + 2);
        gCount = new Float32Array(size);
        gVx = new Float32Array(size);
        gVy = new Float32Array(size);
        wakeVx = new Float32Array(size);
        wakeVy = new Float32Array(size);
        for (let i = 0; i < maxN; i++) {
            if (first) {
                px[i] = Math.random() * w;
                py[i] = Math.random() * h;
                const a = Math.random() * TAU;
                vx[i] = Math.cos(a) * 60 * scale;
                vy[i] = Math.sin(a) * 60 * scale;
            } else {
                px[i] *= sx;
                py[i] *= sy;
                tx[i] *= sx;
                ty[i] *= sy;
            }
        }
        if (first) {
            lastLx = w / 2;
            lastLy = h / 2;
        }
    }

    function cellIndex(x, y) {
        let cx = (x / cell) | 0;
        let cy = (y / cell) | 0;
        if (cx < 0) cx = 0;
        else if (cx >= gw) cx = gw - 1;
        if (cy < 0) cy = 0;
        else if (cy >= gh) cy = gh - 1;
        return (cy + 1) * stride + cx + 1;
    }

    function setCount(count) {
        n = Math.min(maxN, count);
    }

    // Decoded genome parameters. With immediate=false the swarm morphs toward
    // them over TUNING.paramBlend seconds instead of snapping.
    function applyParams(decoded, immediate) {
        if (immediate) {
            params.set(decoded);
            paramsTo.set(decoded);
            blend = 1;
            return;
        }
        paramsFrom.set(params);
        paramsTo.set(decoded);
        blend = 0;
    }

    // points: Float32Array of x,y pairs. A share of particles binds to them,
    // the rest stay loose as dust.
    function setTargets(points, share) {
        const count = points.length >> 1;
        if (!count) return releaseTargets();
        const want = Math.min(n, Math.floor(n * share));
        for (let i = 0; i < n; i++) bound[i] = 0;
        // Stride through particles so every genome contributes to the letters.
        const step = n / want;
        for (let k = 0; k < want; k++) {
            const i = Math.floor(k * step);
            const j = ((k * 7919) % count) << 1;
            tx[i] = points[j];
            ty[i] = points[j + 1];
            bound[i] = 1;
        }
    }

    function releaseTargets() {
        bound.fill(0);
    }

    // Moves every target, used when the page scrolls under the swarm.
    function offsetTargets(dx, dy) {
        for (let i = 0; i < maxN; i++) {
            tx[i] += dx;
            ty[i] += dy;
        }
    }

    // Places particles from index `from` on at one point and throws them
    // outward, biased toward (aimX, aimY). Used when the dormant knot wakes.
    function burst(cx, cy, from, aimX, aimY) {
        const dx = aimX - cx;
        const dy = aimY - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
        for (let i = from; i < maxN; i++) {
            const a = Math.random() * TAU;
            const r = Math.random() * 26 * scale;
            const sp = (60 + Math.random() * Math.random() * 900) * scale;
            const bias = Math.random() * 0.9;
            px[i] = cx + Math.cos(a) * r;
            py[i] = cy + Math.sin(a) * r;
            vx[i] = (Math.cos(a) * (1 - bias) + (dx / d) * bias) * sp;
            vy[i] = (Math.sin(a) * (1 - bias) + (dy / d) * bias) * sp;
            respawn[i] = 0;
        }
    }

    // Kick every bound particle, used when leaving a section.
    function scatter(dirX, dirY, force) {
        for (let i = 0; i < n; i++) {
            if (!bound[i]) continue;
            const a = Math.random() * TAU;
            const f = force * scale * (0.4 + Math.random());
            vx[i] += (dirX * 1.4 + Math.cos(a)) * f;
            vy[i] += (dirY * 1.4 + Math.sin(a)) * f;
        }
    }

    function emitPulse(x, y, charge) {
        let slot = pulses[0];
        for (const p of pulses) {
            if (!p.live) {
                slot = p;
                break;
            }
            if (p.t > slot.t) slot = p;
        }
        slot.x = x;
        slot.y = y;
        slot.t = 0;
        slot.r = 0;
        slot.prev = 0;
        slot.rmax = (T.pulseMin + (T.pulseMax - T.pulseMin) * charge) * Math.min(w, h);
        slot.live = true;
    }

    function splatWake(lx, ly, lvx, lvy) {
        const dx = lx - lastLx;
        const dy = ly - lastLy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.min(24, Math.max(1, Math.ceil(dist / (cell * 0.5))));
        const k = T.wakeSplat / steps;
        for (let s = 1; s <= steps; s++) {
            const x = lastLx + (dx * s) / steps;
            const y = lastLy + (dy * s) / steps;
            const c = cellIndex(x, y);
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    const wgt = ox === 0 && oy === 0 ? k : k * 0.45;
                    const j = c + oy * stride + ox;
                    wakeVx[j] += lvx * wgt;
                    wakeVy[j] += lvy * wgt;
                }
            }
        }
        lastLx = lx;
        lastLy = ly;
    }

    function respawnAtEdge(i, sp) {
        const side = (Math.random() * 4) | 0;
        const m = 8;
        if (side === 0) {
            px[i] = -m;
            py[i] = Math.random() * h;
        } else if (side === 1) {
            px[i] = w + m;
            py[i] = Math.random() * h;
        } else if (side === 2) {
            px[i] = Math.random() * w;
            py[i] = -m;
        } else {
            px[i] = Math.random() * w;
            py[i] = h + m;
        }
        const dx = w / 2 - px[i];
        const dy = h / 2 - py[i];
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
        vx[i] = (dx / d) * sp;
        vy[i] = (dy / d) * sp;
    }

    // light: position and velocity of the visitor's light, lightK its strength.
    // condense: 0..1 pull of bound particles toward their text targets.
    // accrue: whether this frame counts toward fitness.
    function step(dt, lx, ly, lvx, lvy, lightK, condense, accrue) {
        time += dt;

        if (blend < 1) {
            blend = Math.min(1, blend + dt / T.paramBlend);
            const e = blend * blend * (3 - 2 * blend);
            for (let k = 0; k < params.length; k++) params[k] = paramsFrom[k] + (paramsTo[k] - paramsFrom[k]) * e;
        }

        const wakeDecay = Math.exp(-dt / T.wakeTau);
        for (let c = 0; c < wakeVx.length; c++) {
            wakeVx[c] *= wakeDecay;
            wakeVy[c] *= wakeDecay;
        }
        splatWake(lx, ly, lvx * lightK, lvy * lightK);

        gCount.fill(0);
        gVx.fill(0);
        gVy.fill(0);
        const flightEnd = T.respawnTime - T.respawnFlight;
        for (let i = 0; i < n; i++) {
            if (respawn[i] > flightEnd) continue;
            const c = cellIndex(px[i], py[i]);
            gCount[c] += 1;
            gVx[c] += vx[i];
            gVy[c] += vy[i];
        }
        const invMean = (gw * gh) / n;
        for (let c = 0; c < gCount.length; c++) {
            const k = gCount[c];
            if (k > 0) {
                gVx[c] /= k;
                gVy[c] /= k;
                gCount[c] = k * invMean;
            }
        }

        let anyPulse = false;
        for (const p of pulses) {
            if (!p.live) continue;
            p.t += dt;
            p.prev = p.r;
            p.r = p.rmax * (1 - Math.exp(-p.t / T.pulseRise));
            if (p.t > T.pulseLife) p.live = false;
            else anyPulse = true;
        }

        const s = scale;
        const invReach = 1 / (T.lightReach * Math.min(w, h));
        const invSigma = 1 / (T.fitnessSigma * Math.min(w, h));
        const noiseK = T.noiseScale / s;
        const margin = T.wrapMargin;
        const relax = 1 - Math.exp(-dt * T.speedRelax);
        const fleeRange = T.fleeRange * s;
        const free = 1 - 0.96 * condense;
        if (accrue) activeTime += dt;

        for (let i = 0; i < n; i++) {
            const g = gene[i];
            const o = g * GENE_COUNT;
            let x = px[i];
            let y = py[i];
            let ux = vx[i];
            let uy = vy[i];
            let life = respawn[i];
            const o4 = i * 4;

            if (life > flightEnd) {
                // Struck: fly outward as an ember, then come back in from an edge.
                const damp = Math.exp(-dt * 3.2);
                ux *= damp;
                uy *= damp;
                x += ux * dt;
                y += uy * dt;
                life -= dt;
                px[i] = x;
                py[i] = y;
                vx[i] = ux;
                vy[i] = uy;
                respawn[i] = life;
                if (life <= flightEnd) respawnAtEdge(i, params[o] * s);
                render[o4] = x;
                render[o4 + 1] = y;
                render[o4 + 2] = 1.1 * Math.max(0, (life - flightEnd) / T.respawnFlight);
                render[o4 + 3] = 1;
                continue;
            }

            const speed = params[o] * s;
            const attract = params[o + 2];
            const orbit = params[o + 3] * s;
            const c = cellIndex(x, y);
            const q = gCount[c];
            let ax = 0;
            let ay = 0;

            // The light: hold a preferred distance and drift around it.
            const dx = lx - x;
            const dy = ly - y;
            const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
            const nx = dx / d;
            const ny = dy / d;
            const dr = d * invReach;
            const fall = 1 / (1 + dr * dr);
            const off = d - orbit;
            const radial = off / (Math.abs(off) + 60 * s);
            const pull = attract * T.attractK * s * radial * (radial > 0 ? fall : 1) * lightK;
            const swirl = attract * T.swirlK * s * fall * lightK;
            ax += nx * pull - ny * swirl;
            ay += ny * pull + nx * swirl;

            // Neighbours, and the wake the light leaves behind.
            ax += (gVx[c] - ux) * T.alignK + wakeVx[c] * T.wakeK;
            ay += (gVy[c] - uy) * T.alignK + wakeVy[c] * T.wakeK;

            const gx = (gCount[c + 1] - gCount[c - 1]) * 0.5;
            const gy = (gCount[c + stride] - gCount[c - stride]) * 0.5;
            const crowd = q > T.densityCap ? (q - T.densityCap) * T.separationK : 0;
            const climb = (params[o + 4] * T.cohesionK - crowd) * s;
            ax += gx * climb;
            ay += gy * climb;

            const flowA = Math.sin(x * noiseK + time * 0.13);
            const flowB = Math.cos(y * noiseK * 1.13 - time * 0.1);
            const theta = phase[i] * 0.35 + time * 0.21 + 2.2 * flowA + 2.2 * flowB;
            const wander = params[o + 5] * T.wanderK * s;
            ax += Math.cos(theta) * wander;
            ay += Math.sin(theta) * wander;

            if (anyPulse) {
                for (let k = 0; k < MAX_PULSES; k++) {
                    const p = pulses[k];
                    if (!p.live || p.t > T.pulseLethal) continue;
                    const ex = x - p.x;
                    const ey = y - p.y;
                    const pd = Math.sqrt(ex * ex + ey * ey) + 1e-3;
                    if (pd >= p.prev && pd <= p.r) {
                        life = T.respawnTime;
                        caught[g] += 1;
                        caughtTotal += 1;
                        const a = Math.random() * 0.8 - 0.4;
                        const kick = (380 + Math.random() * 260) * s;
                        ux = (ex / pd) * kick - (ey / pd) * kick * a;
                        uy = (ey / pd) * kick + (ex / pd) * kick * a;
                        break;
                    }
                    const ahead = pd - p.r;
                    if (ahead > 0 && ahead < fleeRange) {
                        const f = params[o + 6] * T.fleeK * s * (1 - ahead / fleeRange);
                        ax += (ex / pd) * f;
                        ay += (ey / pd) * f;
                    }
                }
                if (life === T.respawnTime) {
                    vx[i] = ux;
                    vy[i] = uy;
                    respawn[i] = life;
                    render[o4] = x;
                    render[o4 + 1] = y;
                    render[o4 + 2] = 1.1;
                    render[o4 + 3] = 1;
                    continue;
                }
            }

            const amax = params[o + 1] * T.turnK * s;
            const amag = Math.sqrt(ax * ax + ay * ay);
            if (amag > amax) {
                ax *= amax / amag;
                ay *= amax / amag;
            }

            let hold = 0;
            if (condense > 0 && bound[i]) {
                hold = condense;
                const ox = Math.cos(time * 1.3 + phase[i]) * T.targetOrbit;
                const oy = Math.sin(time * 1.1 + phase[i] * 1.7) * T.targetOrbit;
                const k = stiff[i] * T.springK * condense;
                ax = ax * free + (tx[i] + ox - x) * k - ux * T.springDamp * condense;
                ay = ay * free + (ty[i] + oy - y) * k - uy * T.springDamp * condense;
            }

            ux += ax * dt;
            uy += ay * dt;
            const cur = Math.sqrt(ux * ux + uy * uy) + 1e-3;
            const f = 1 + (speed / cur - 1) * relax * (1 - hold);
            ux *= f;
            uy *= f;
            x += ux * dt;
            y += uy * dt;
            // The field has no walls: leaving one side re-enters from the other.
            if (x < -margin) x += w + margin * 2;
            else if (x > w + margin) x -= w + margin * 2;
            if (y < -margin) y += h + margin * 2;
            else if (y > h + margin) y -= h + margin * 2;

            px[i] = x;
            py[i] = y;
            vx[i] = ux;
            vy[i] = uy;

            // A lineage keeps its own hue, but it swings with the flow it is in
            // and with its speed, so colour pools and streaks across the field.
            let hue = params[o + 7] + T.hueWave * 0.5 * (flowA + flowB) + T.hueSpeed * (cur / (speed + 1) - 1);
            if (hue < 0) hue = 0;
            else if (hue > 0.75) hue = 0.75;
            // Particles brighten as they come close to the light.
            const z = d * invSigma;
            const near = Math.exp(-z * z);
            let bright = (0.62 + 0.38 * Math.sin(time * 0.7 + phase[i] * 3)) * (1 + T.glow * near * lightK);
            if (hold > 0) bright *= 1 - T.boundDim * hold;
            if (life > 0) {
                life -= dt;
                if (life < 0) life = 0;
                const cool = life / flightEnd;
                hue += (1 - hue) * cool;
                bright *= Math.min(1, (flightEnd - life) / 0.4) * (1 + cool * 0.6);
                respawn[i] = life;
            } else if (accrue) {
                fitSum[g] += (near / (1 + q)) * dt;
            }

            render[o4] = x;
            render[o4 + 1] = y;
            render[o4 + 2] = bright;
            render[o4 + 3] = hue;
        }
    }

    // Per-genome fitness for the window since the last call; resets the window.
    function takeFitness(out) {
        const per = n / GENOMES;
        const t = Math.max(activeTime, 1e-3);
        for (let g = 0; g < GENOMES; g++) {
            const light = fitSum[g] / (per * t);
            const survive = 1 / (1 + (2 * caught[g]) / per);
            out[g] = light * survive + 0.02;
        }
        fitSum.fill(0);
        caught.fill(0);
        activeTime = 0;
        return out;
    }

    return {
        render,
        pulses,
        resize,
        setCount,
        applyParams,
        setTargets,
        releaseTargets,
        offsetTargets,
        burst,
        scatter,
        emitPulse,
        step,
        takeFitness,
        get count() {
            return n;
        },
        get activeTime() {
            return activeTime;
        },
        get caughtTotal() {
            return caughtTotal;
        }
    };
}
