let animationFrame;
let stars = [];

export function initAnimations() {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    
    resizeCanvas(canvas);
    window.addEventListener('resize', () => resizeCanvas(canvas));
    
    createStars(canvas, ctx);
    animateStars(canvas, ctx);
    
    if (window.innerWidth > 768) {
        createMatrixRain();
    }
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

function animateStars(canvas, ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const style = getComputedStyle(document.body);
    const color = style.getPropertyValue('--terminal-fg');
    
    ctx.font = '10px monospace';
    
    stars.forEach(star => {
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0) {
            star.twinkleSpeed = -star.twinkleSpeed;
        }
        
        ctx.globalAlpha = Math.max(0, Math.min(1, star.opacity)) * 0.5;
        ctx.fillStyle = color;
        ctx.fillText(star.char, star.x, star.y);
    });
    
    animationFrame = requestAnimationFrame(() => animateStars(canvas, ctx));
}

function createMatrixRain() {
    const matrixContainer = document.createElement('div');
    matrixContainer.id = 'matrix-rain';
    matrixContainer.style.position = 'fixed';
    matrixContainer.style.top = '0';
    matrixContainer.style.left = '0';
    matrixContainer.style.width = '100%';
    matrixContainer.style.height = '100%';
    matrixContainer.style.pointerEvents = 'none';
    matrixContainer.style.zIndex = '0';
    
    const chars = '01가나다라마바사아자차카타파하김주진서울코딩개발프로그래머안녕하세요반갑습니다';
    const columns = Math.floor(window.innerWidth / 20);
    
    for (let i = 0; i < columns; i++) {
        // Create multiple characters per column for more density
        for (let j = 0; j < 3; j++) {
            const span = document.createElement('span');
            span.className = 'matrix-char';
            span.textContent = chars[Math.floor(Math.random() * chars.length)];
            span.style.left = `${i * 20}px`;
            span.style.setProperty('--duration', `${Math.random() * 15 + 10}s`);
            span.style.setProperty('--delay', '0s');
            span.style.fontSize = `${Math.random() * 6 + 10}px`;
            matrixContainer.appendChild(span);
        }
    }
    
    document.body.appendChild(matrixContainer);
}

export function cleanup() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
}