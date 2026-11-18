import { GENES, GENOMES, RAMP } from './config.js?v=20261119.1';

const HUE_GENE = GENES.length - 1;

function rampColor(position) {
    const t = Math.min(1, Math.max(0, position)) * 4;
    const i = Math.min(3, Math.floor(t));
    const f = t - i;
    const c = RAMP[i].map((v, k) => Math.round((v + (RAMP[i + 1][k] - v) * f) * 255));
    return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

// The instrument readout: generation counter, one bar per genome (colour is
// its hue gene, height its fitness), and the mean genes on hover or focus.
export function createHud(host, actions = {}) {
    const el = document.createElement('div');
    el.id = 'readout';
    el.innerHTML = `
        <button type="button" class="gen" aria-expanded="false" aria-controls="lineage-detail">
            <span class="gen-label">Gen</span> <span class="gen-value">0000</span>
        </button>
        <div class="lineage" aria-hidden="true"></div>
        <button type="button" class="sound" aria-pressed="false" title="Sound (S)">Sound <span>off</span></button>
        <div class="detail" id="lineage-detail" hidden>
            <p class="detail-note">Mean genes of the 24 lineages alive right now.</p>
            <dl></dl>
            <button type="button" class="reset">Reset lineage</button>
        </div>`;
    host.appendChild(el);

    const value = el.querySelector('.gen-value');
    const toggle = el.querySelector('.gen');
    const detail = el.querySelector('.detail');
    const list = el.querySelector('dl');
    const strip = el.querySelector('.lineage');
    const bars = [];
    for (let i = 0; i < GENOMES; i++) {
        const bar = document.createElement('i');
        strip.appendChild(bar);
        bars.push(bar);
    }
    const rows = GENES.map((gene) => {
        const dt = document.createElement('dt');
        dt.textContent = gene.name;
        const dd = document.createElement('dd');
        list.append(dt, dd);
        return dd;
    });

    const setOpen = (open) => {
        detail.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(detail.hidden));
    for (const part of [toggle, strip])
        part.addEventListener('pointerenter', (event) => event.pointerType === 'mouse' && setOpen(true));
    el.addEventListener('pointerleave', (event) => event.pointerType === 'mouse' && setOpen(false));
    el.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || detail.hidden) return;
        event.stopPropagation();
        setOpen(false);
        toggle.focus();
    });
    el.querySelector('.reset').addEventListener('click', () => actions.onReset?.());
    const sound = el.querySelector('.sound');
    sound.addEventListener('click', () => actions.onSound?.());

    const hint = document.createElement('p');
    hint.id = 'hint';
    hint.setAttribute('aria-live', 'polite');
    document.body.appendChild(hint);

    function update(gen, genomes, fitness) {
        value.textContent = String(gen).padStart(4, '0');
        let top = 0;
        if (fitness) for (let g = 0; g < GENOMES; g++) top = Math.max(top, fitness[g]);
        for (let g = 0; g < GENOMES; g++) {
            const share = fitness && top > 0 ? fitness[g] / top : 0.5;
            bars[g].style.background = rampColor(GENES[HUE_GENE].max * genomes[g][HUE_GENE]);
            bars[g].style.transform = `scaleY(${(0.18 + 0.82 * share).toFixed(3)})`;
        }
        GENES.forEach((gene, k) => {
            let mean = 0;
            for (const genome of genomes) mean += genome[k];
            mean /= genomes.length;
            const real = gene.min + (gene.max - gene.min) * mean;
            rows[k].textContent = real >= 10 ? real.toFixed(0) : real.toFixed(2);
        });
        el.classList.remove('is-ticking');
        void el.offsetWidth;
        el.classList.add('is-ticking');
    }

    return {
        el,
        update,
        setSound(on) {
            sound.setAttribute('aria-pressed', String(on));
            sound.querySelector('span').textContent = on ? 'on' : 'off';
        },
        showHint(text) {
            hint.textContent = text;
            hint.classList.toggle('is-visible', !!text);
        }
    };
}
