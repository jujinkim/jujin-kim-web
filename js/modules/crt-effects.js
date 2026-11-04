export function initCRTEffects() {
    const screen = document.getElementById('crt-screen');
    if (!screen) return;

    screen.dataset.noise = 'subtle';

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
            <label><input id="crt-curved" type="checkbox" checked> Curved glass</label>
            <label class="crt-noise-label" for="crt-noise-mode">Noise</label>
            <select id="crt-noise-mode">
                <option value="static">Static</option>
                <option value="subtle" selected>Subtle motion</option>
                <option value="retro">Retro</option>
            </select>
            <p>Preview only. Changes are not saved. Reduce Motion pauses animation.</p>
        </div>
    `;

    // Keep preview controls independent of the site's terminal shortcuts.
    preview.addEventListener('keydown', event => event.stopPropagation());
    preview.addEventListener('change', () => {
        screen.classList.toggle('is-disabled', !preview.querySelector('#crt-enabled').checked);
        screen.classList.toggle('is-flat', !preview.querySelector('#crt-curved').checked);
        screen.dataset.noise = preview.querySelector('#crt-noise-mode').value;
    });
    document.body.appendChild(preview);
}
