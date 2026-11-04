import { initScreenCurvature } from './screen-curvature.js';

export function initCRTEffects() {
    const screen = document.getElementById('crt-screen');
    const viewport = document.getElementById('crt-viewport');
    if (!screen || !viewport) return;

    screen.dataset.noise = 'retro';
    document.body.classList.add('crt-effects-enabled');
    initScreenCurvature(viewport);

    const updateVisibility = () => {
        screen.classList.toggle('is-paused', document.hidden);
    };
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();

    if (new URLSearchParams(window.location.search).get('crt-preview') !== '1') return;

    const preview = document.createElement('details');
    preview.id = 'crt-preview';
    preview.open = true;
    preview.innerHTML = `
        <summary>CRT Preview</summary>
        <div class="crt-preview-controls">
            <label><input id="crt-enabled" type="checkbox" checked> CRT effects</label>
            <label><input id="crt-curved" type="checkbox" checked> Screen curvature</label>
            <label class="crt-noise-label" for="crt-noise-mode">Noise</label>
            <select id="crt-noise-mode">
                <option value="static">1. Static</option>
                <option value="subtle">2. Subtle motion</option>
                <option value="retro" selected>3. Retro</option>
            </select>
            <p>Preview only. Changes are not saved. Reduce Motion pauses animation.</p>
        </div>
    `;

    // Keep preview controls independent of the site's terminal shortcuts.
    preview.addEventListener('keydown', event => event.stopPropagation());
    preview.addEventListener('change', () => {
        const enabled = preview.querySelector('#crt-enabled').checked;
        const curved = preview.querySelector('#crt-curved').checked;
        document.body.classList.toggle('crt-effects-enabled', enabled);
        screen.classList.toggle('is-disabled', !enabled);
        screen.classList.toggle('is-flat', !curved);
        viewport.classList.toggle('is-flat', !enabled || !curved);
        document.body.classList.toggle('crt-curvature-enabled', enabled && curved);
        screen.dataset.noise = preview.querySelector('#crt-noise-mode').value;
        window.dispatchEvent(new Event('crt-effects-changed'));
    });
    document.body.appendChild(preview);
}
