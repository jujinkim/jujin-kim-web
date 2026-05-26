let animationFrame;
let stars = [];
let matrixChars = [];
const chars = '01가나다라마바사아자차카타파하김주진서울코딩개발프로그래머안녕하세요반갑습니다';

let mouse = { x: null, y: null, active: false };
let matrixRainEnabled = true;

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
    return matrixRainEnabled;
}

export function initAnimations() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    resizeCanvas(canvas);
    
    // Setup resize listener
    window.addEventListener('resize', () => {
        resizeCanvas(canvas);
        if (window.innerWidth > 768) {
            if (matrixChars.length === 0) {
                createMatrixRain(canvas);
            }
        } else {
            matrixChars = [];
        }
    });
    
    // Setup mouse/touch listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    
    createStars(canvas, ctx);
    
    if (window.innerWidth > 768) {
        createMatrixRain(canvas);
    } else {
        matrixChars = [];
    }
    
    animate(canvas, ctx);
}

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createStars(canvas, ctx) {
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
    const columns = Math.floor(canvas.width / 20);
    
    for (let i = 0; i < columns; i++) {
        const count = Math.random() * 2 + 1;
        for (let j = 0; j < count; j++) {
            const speedY = Math.random() * 2 + 1.2;
            matrixChars.push({
                x: i * 20 + Math.random() * 6 - 3,
                y: Math.random() * canvas.height - canvas.height,
                char: chars[Math.floor(Math.random() * chars.length)],
                speedY: speedY,
                vx: 0,
                vy: speedY,
                fontSize: Math.random() * 6 + 10,
                opacity: Math.random() * 0.5 + 0.3,
                scale: 1.0,
                state: 'falling',
                colorType: Math.random() < 0.2 ? 'highlight' : 'dim'
            });
        }
    }
}

function animate(canvas, ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const style = getComputedStyle(document.body);
    const colorHighlight = style.getPropertyValue('--terminal-highlight').trim() || '#7ef2ad';
    const colorDim = style.getPropertyValue('--terminal-dim').trim() || '#2f4a3c';
    const colorFg = style.getPropertyValue('--terminal-fg').trim() || '#e6efe7';
    
    // Draw Stars
    ctx.font = '10px monospace';
    stars.forEach(star => {
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0) {
            star.twinkleSpeed = -star.twinkleSpeed;
        }
        
        ctx.globalAlpha = Math.max(0, Math.min(1, star.opacity)) * 0.15;
        ctx.fillStyle = colorFg;
        ctx.shadowBlur = 0;
        ctx.fillText(star.char, star.x, star.y);
    });
    
    // Draw Matrix Rain
    if (matrixRainEnabled) {
        matrixChars.forEach(char => {
            const dx = mouse.x - char.x;
            const dy = mouse.y - char.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Damping (air resistance)
            const damping = 0.92;
            
            if (char.state === 'falling') {
                if (mouse.active && dist < 25) {
                    char.state = 'shrinking';
                } else {
                    let fx = 0;
                    let fy = 0;
                    
                    if (mouse.active && dist < 450) {
                        const intensity = (1 - dist / 450);
                        const pullForce = 2.8 * intensity; // attraction acceleration
                        
                        fx = (dx / dist) * pullForce;
                        fy = (dy / dist) * pullForce;
                    }
                    
                    // Gravity acceleration calculated to maintain char.speedY terminal velocity
                    const gravity = char.speedY * (1 - damping) / damping;
                    
                    // Update velocities
                    char.vx += fx;
                    char.vy += gravity + fy;
                    
                    // Apply damping
                    char.vx *= damping;
                    char.vy *= damping;
                    
                    // Update positions
                    char.x += char.vx;
                    char.y += char.vy;
                }
            } else if (char.state === 'shrinking') {
                char.scale -= 0.08;
                char.opacity -= 0.08;
                
                const dirX = dx / (dist || 1);
                const dirY = dy / (dist || 1);
                char.vx = dirX * 3.5;
                char.vy = dirY * 3.5;
                
                char.x += char.vx;
                char.y += char.vy;
                
                if (char.scale <= 0 || char.opacity <= 0) {
                    char.x = Math.random() * canvas.width;
                    char.y = -Math.random() * 100 - 20;
                    char.vx = 0;
                    char.vy = char.speedY;
                    char.scale = 1.0;
                    char.opacity = Math.random() * 0.5 + 0.3;
                    char.state = 'falling';
                    char.speedY = Math.random() * 2 + 1.2;
                    char.char = chars[Math.floor(Math.random() * chars.length)];
                }
            }
            
            if (char.x < -20 || char.x > canvas.width + 20 || char.y > canvas.height + 20) {
                char.x = Math.random() * canvas.width;
                char.y = -Math.random() * 100 - 20;
                char.vx = 0;
                char.vy = char.speedY;
                char.scale = 1.0;
                char.opacity = Math.random() * 0.5 + 0.3;
                char.state = 'falling';
                char.speedY = Math.random() * 2 + 1.2;
            }
            
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, char.opacity)) * 0.35;
            ctx.font = `${char.fontSize * char.scale}px monospace`;
            ctx.fillStyle = char.colorType === 'highlight' ? colorHighlight : colorDim;
            
            ctx.shadowColor = char.colorType === 'highlight' ? colorHighlight : colorDim;
            ctx.shadowBlur = 4;
            
            ctx.fillText(char.char, char.x, char.y);
            ctx.restore();
        });
    }
    
    animationFrame = requestAnimationFrame(() => animate(canvas, ctx));
}

export function cleanup() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('mouseleave', handleMouseLeave);
}