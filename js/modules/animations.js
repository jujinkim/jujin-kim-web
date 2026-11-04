let animationFrame;
let stars = [];
let matrixChars = [];
const chars = '01가나다라마바사아자차카타파하김주진서울코딩개발프로그래머안녕하세요반갑습니다';

let mouse = { x: null, y: null, active: false };
let matrixRainEnabled = true;
let reducedMotion;
let refreshAnimation;
let disposeListeners;
let colors = {};

function handleMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
}

function handleTouchMove(e) {
    if (e.touches && e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
    }
}

function handleMouseLeave() {
    mouse.active = false;
}

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
    
    resizeCanvas(canvas);
    
    refreshAnimation = () => {
        cancelAnimationFrame(animationFrame);
        animate(canvas, ctx);
    };
    const updateColors = () => {
        const style = getComputedStyle(document.body);
        colors.dim = style.getPropertyValue('--terminal-dim').trim();
        colors.fg = style.getPropertyValue('--terminal-fg').trim();
        colors.matrixOpacity = document.body.dataset.theme === 'light' ? 0.06 : 0.11;
        refreshAnimation();
    };
    const handleResize = () => {
        resizeCanvas(canvas);
        createStars(canvas);
        if (window.innerWidth > 768) {
            createMatrixRain(canvas);
        } else {
            matrixChars = [];
        }
        refreshAnimation();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('theme-changed', updateColors);
    document.addEventListener('visibilitychange', refreshAnimation);
    if (reducedMotion.addEventListener) {
        reducedMotion.addEventListener('change', refreshAnimation);
    } else {
        reducedMotion.addListener(refreshAnimation);
    }
    disposeListeners = () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('theme-changed', updateColors);
        document.removeEventListener('visibilitychange', refreshAnimation);
        if (reducedMotion.removeEventListener) {
            reducedMotion.removeEventListener('change', refreshAnimation);
        } else {
            reducedMotion.removeListener(refreshAnimation);
        }
    };
    
    // Setup mouse/touch listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    
    createStars(canvas);
    
    if (window.innerWidth > 768) {
        createMatrixRain(canvas);
    } else {
        matrixChars = [];
    }
    
    updateColors();
}

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createStars(canvas) {
    const starCount = Math.floor((canvas.width * canvas.height) / 10000);
    stars = [];
    
    const starChars = ['*', '+', '.', '°', '·'];
    
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            char: starChars[Math.floor(Math.random() * starChars.length)],
            opacity: Math.random(),
            twinkleSpeed: Math.random() * 0.02 + 0.005
        });
    }
}

function createMatrixRain(canvas) {
    matrixChars = [];
    const columns = Math.floor(canvas.width / 40);
    
    for (let i = 0; i < columns; i++) {
        const count = Math.random() * 2 + 1;
        for (let j = 0; j < count; j++) {
            const speedY = Math.random() * 2 + 1.2;
            matrixChars.push({
                x: i * 40 + Math.random() * 6 - 3,
                y: Math.random() * canvas.height,
                char: chars[Math.floor(Math.random() * chars.length)],
                speedY: speedY,
                fontSize: Math.random() * 6 + 10,
                opacity: Math.random() * 0.5 + 0.3,
                scale: 1.0,
                state: 'falling'
            });
        }
    }
}

function animate(canvas, ctx) {
    const moving = !reducedMotion.matches && !document.hidden && window.innerWidth > 768;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Stars
    ctx.font = '10px monospace';
    stars.forEach(star => {
        if (moving) star.opacity += star.twinkleSpeed;
        if (moving && (star.opacity > 1 || star.opacity < 0)) {
            star.twinkleSpeed = -star.twinkleSpeed;
        }
        
        ctx.globalAlpha = Math.max(0, Math.min(1, star.opacity)) * 0.05;
        ctx.fillStyle = colors.fg;
        ctx.shadowBlur = 0;
        ctx.fillText(star.char, star.x, star.y);
    });
    
    // Draw Matrix Rain
    if (matrixRainEnabled) {
        matrixChars.forEach(char => {
            const dx = mouse.x - char.x;
            const dy = mouse.y - char.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (moving && char.state === 'falling') {
                if (mouse.active && dist < 25) {
                    char.state = 'shrinking';
                } else {
                    let pullX = 0;
                    let pullY = 0;
                    
                    if (mouse.active && dist < 450) {
                        const intensity = (1 - dist / 450);
                        const pullForce = 3.2 * intensity; // Direct pull speed
                        
                        pullX = (dx / dist) * pullForce;
                        // Only pull vertically if the character is above the cursor
                        if (dy > 0) {
                            pullY = (dy / dist) * pullForce;
                        }
                    }
                    
                    // Directly apply pull vector and falling speed
                    char.x += pullX;
                    char.y += pullY + char.speedY;
                }
            } else if (moving && char.state === 'shrinking') {
                char.scale -= 0.08;
                char.opacity -= 0.08;
                
                const dirX = dx / (dist || 1);
                const dirY = dy / (dist || 1);
                
                char.x += dirX * 3.5;
                char.y += dirY * 3.5;
                
                if (char.scale <= 0 || char.opacity <= 0) {
                    char.x = Math.random() * canvas.width;
                    char.y = -Math.random() * 100 - 20;
                    char.scale = 1.0;
                    char.opacity = Math.random() * 0.5 + 0.3;
                    char.state = 'falling';
                    char.speedY = Math.random() * 2 + 1.2;
                    char.char = chars[Math.floor(Math.random() * chars.length)];
                }
            }
            
            if (moving && (char.x < -20 || char.x > canvas.width + 20 || char.y > canvas.height + 20)) {
                char.x = Math.random() * canvas.width;
                char.y = -Math.random() * 100 - 20;
                char.scale = 1.0;
                char.opacity = Math.random() * 0.5 + 0.3;
                char.state = 'falling';
                char.speedY = Math.random() * 2 + 1.2;
            }
            
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, char.opacity)) * colors.matrixOpacity;
            ctx.font = `${char.fontSize * char.scale}px monospace`;
            ctx.fillStyle = colors.dim;
            ctx.shadowBlur = 0;
            
            ctx.fillText(char.char, char.x, char.y);
            ctx.restore();
        });
    }
    
    animationFrame = moving ? requestAnimationFrame(() => animate(canvas, ctx)) : null;
}

export function cleanup() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    if (disposeListeners) disposeListeners();
    animationFrame = null;
    disposeListeners = null;
    refreshAnimation = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('mouseleave', handleMouseLeave);
}
