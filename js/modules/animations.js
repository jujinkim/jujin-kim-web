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
let resizeAnimation;
let rasterScale = 1;
let animationWidth = 0;
let animationHeight = 0;
let disposeListeners;
let colors = {};

const randomCharacter = () => chars[Math.floor(Math.random() * chars.length)];

export function toggleMatrixRain() {
    matrixRainEnabled = !matrixRainEnabled;
    if (refreshAnimation) refreshAnimation();
    return matrixRainEnabled;
}

export function setAnimationResolution(value) {
    rasterScale = Math.max(0.1, Math.min(1, value));
    resizeAnimation?.();
}

export function initAnimations() {
    cleanup();
    if (document.body.dataset.displayMode === 'web1') return;
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
        const glass = document.getElementById('monitor-glass');
        animationWidth = glass.clientWidth;
        animationHeight = glass.clientHeight;
        canvas.width = Math.max(1, Math.round(animationWidth * rasterScale));
        canvas.height = Math.max(1, Math.round(animationHeight * rasterScale));
        createStars(animationWidth, animationHeight);
        createMatrixRain(animationWidth, animationHeight);
        refreshAnimation();
    };
    resizeAnimation = handleResize;
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.getElementById('monitor-glass'));
    window.addEventListener('theme-changed', updateColors);
    window.addEventListener('crt-effects-changed', updateColors);
    document.addEventListener('visibilitychange', refreshAnimation);
    if (reducedMotion.addEventListener) {
        reducedMotion.addEventListener('change', refreshAnimation);
    } else {
        reducedMotion.addListener(refreshAnimation);
    }
    disposeListeners = () => {
        observer.disconnect();
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

function createStars(width, height) {
    const starChars = ['*', '+', '.', '°', '·'];
    stars = Array.from({ length: Math.floor(width * height / 10000) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        char: starChars[Math.floor(Math.random() * starChars.length)],
        opacity: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.005
    }));
}

function createMatrixRain(width, height) {
    matrixChars = [];
    if (width <= 768) return;
    const rows = Math.ceil(height / CELL_SIZE);
    for (let column = 0; column < Math.floor(width / CELL_SIZE); column += 2) {
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
    if (document.hidden) { animationFrame = null; return; }
    const width = animationWidth, height = animationHeight;
    if (!width || !height) { animationFrame = null; return; }
    const moving = !reducedMotion.matches && width > 768;
    const scheduleFrame = () => requestAnimationFrame(time => animate(canvas, ctx, time));
    if (moving && now - lastFrameTime < FRAME_INTERVAL) {
        animationFrame = scheduleFrame();
        return;
    }
    lastFrameTime = now;
    const drawCharacter = (char, x, y) => {
        ctx.fillText(char, x, y);
    };
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
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
        const rows = Math.ceil(height / CELL_SIZE);
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
    resizeAnimation = null;
    rasterScale = 1;
}
