import { getCurvedPoint } from './screen-curvature.js';

const CELL_SIZE = 22;
const TRAIL_LENGTH = 2;
const FRAME_INTERVAL = 50;
const chars = '01가나다라마바사아자차카타파하김주진서울코딩개발프로그래머안녕하세요반갑습니다';
let animationFrame;
let lastFrameTime = 0;
let stars = [];
let matrixChars = [];
let matrixRainEnabled = true;
let reducedMotion;
let refreshAnimation;
let disposeListeners;
let colors = {};

const randomCharacter = () => chars[Math.floor(Math.random() * chars.length)];

export function toggleMatrixRain() {
    matrixRainEnabled = !matrixRainEnabled;
    if (refreshAnimation) refreshAnimation();
    return matrixRainEnabled;
}

export function initAnimations() {
    cleanup();
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    refreshAnimation = () => {
        cancelAnimationFrame(animationFrame);
        lastFrameTime = -Infinity;
        const now = performance.now();
        matrixChars.forEach(stream => { stream.nextStepAt = now + stream.interval; });
        animate(canvas, ctx, now);
    };
    const updateColors = () => {
        const style = getComputedStyle(document.body);
        colors.fg = style.getPropertyValue('--terminal-fg').trim();
        const isLight = document.body.dataset.theme === 'light';
        colors.matrix = isLight ? '#38674d' : '#6fa984';
        colors.matrixOpacity = isLight ? 0.16 : 0.24;
        refreshAnimation();
    };
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createStars(canvas);
        createMatrixRain(canvas);
        refreshAnimation();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('theme-changed', updateColors);
    window.addEventListener('crt-effects-changed', updateColors);
    document.addEventListener('visibilitychange', refreshAnimation);
    if (reducedMotion.addEventListener) {
        reducedMotion.addEventListener('change', refreshAnimation);
    } else {
        reducedMotion.addListener(refreshAnimation);
    }
    disposeListeners = () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('theme-changed', updateColors);
        window.removeEventListener('crt-effects-changed', updateColors);
        document.removeEventListener('visibilitychange', refreshAnimation);
        if (reducedMotion.removeEventListener) {
            reducedMotion.removeEventListener('change', refreshAnimation);
        } else {
            reducedMotion.removeListener(refreshAnimation);
        }
    };
    updateColors();
    handleResize();
}

function createStars(canvas) {
    const starChars = ['*', '+', '.', '°', '·'];
    stars = Array.from({ length: Math.floor(canvas.width * canvas.height / 10000) }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        char: starChars[Math.floor(Math.random() * starChars.length)],
        opacity: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.005
    }));
}

function createMatrixRain(canvas) {
    matrixChars = [];
    if (canvas.width <= 768) return;
    const rows = Math.ceil(canvas.height / CELL_SIZE);
    for (let column = 0; column < Math.floor(canvas.width / CELL_SIZE); column += 2) {
        const interval = 160 + Math.floor(Math.random() * 3) * 40;
        matrixChars.push({
            column,
            row: Math.floor(Math.random() * rows),
            glyphs: Array.from({ length: TRAIL_LENGTH + 1 }, randomCharacter),
            opacity: 0.7 + Math.random() * 0.3,
            interval,
            nextStepAt: performance.now() + interval
        });
    }
}

function animate(canvas, ctx, now = performance.now()) {
    const moving = !reducedMotion.matches && !document.hidden && window.innerWidth > 768;
    const scheduleFrame = () => requestAnimationFrame(time => animate(canvas, ctx, time));
    if (moving && now - lastFrameTime < FRAME_INTERVAL) {
        animationFrame = scheduleFrame();
        return;
    }
    lastFrameTime = now;
    const curved = document.body.classList.contains('crt-curvature-enabled');
    const drawCharacter = (char, x, y) => {
        const point = curved ? getCurvedPoint(x, y, canvas.width, canvas.height) : [x, y];
        ctx.fillText(char, point[0], point[1]);
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    stars.forEach(star => {
        if (moving) star.opacity += star.twinkleSpeed;
        if (moving && (star.opacity > 1 || star.opacity < 0)) star.twinkleSpeed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, star.opacity)) * 0.035;
        ctx.fillStyle = colors.fg;
        drawCharacter(star.char, star.x, star.y);
    });

    if (matrixRainEnabled) {
        const rows = Math.ceil(canvas.height / CELL_SIZE);
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.matrix;
        matrixChars.forEach(stream => {
            if (moving && now >= stream.nextStepAt) {
                stream.row = (stream.row + 1) % (rows + TRAIL_LENGTH);
                stream.glyphs.unshift(randomCharacter());
                stream.glyphs.pop();
                stream.nextStepAt = now + stream.interval;
            }
            // Each glyph stays in its cell; only its age changes as the head advances.
            stream.glyphs.forEach((char, age) => {
                const row = stream.row - age;
                if (row < 0 || row >= rows) return;
                ctx.globalAlpha = colors.matrixOpacity * stream.opacity * Math.pow(0.35, age);
                drawCharacter(char, (stream.column + 0.5) * CELL_SIZE, (row + 0.75) * CELL_SIZE);
            });
        });
    }
    animationFrame = moving ? scheduleFrame() : null;
}

export function cleanup() {
    cancelAnimationFrame(animationFrame);
    if (disposeListeners) disposeListeners();
    animationFrame = null;
    disposeListeners = null;
    refreshAnimation = null;
}
