// The room in 3D. The terminal stays real DOM: the monitor model is built
// around the measured #monitor-glass rectangle and the resting camera uses an
// off-axis frustum that keeps the screen plane pixel-fixed, so text is never
// transformed while reading. Away from rest (entrance, look-around) the shell
// follows the camera through a CSS matrix3d.
//
// World units are metres. The origin is the viewport centre on the screen
// plane, +y is up and +z points at the viewer.

const VENDOR = '../vendor/three.min.js?v=20261119.6';
const OFF_KEY = 'room3d-off';
const SCREEN_HEIGHT = 0.33;
const CAMERA_DISTANCE = 1.15; // in viewport heights
const NEAR = 0.05;
const FAR = 30;
const LOOK_MS = 1100;

const root = document.documentElement;
const desktop = matchMedia('(min-width: 1000px) and (min-height: 600px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let T = null;
let initPromise = null;
let dead = false;
let S = null; // everything the running scene owns

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function fail() {
    delete root.dataset.room3d;
    try {
        sessionStorage.setItem(OFF_KEY, '1');
    } catch {}
}

// ---------- small builders ----------

function std(color, roughness = 0.85, metalness = 0, extra) {
    return new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function glowMaterial(r, g, b) {
    const material = new T.MeshBasicMaterial();
    material.color.setRGB(r, g, b);
    return material;
}

// A box given by its extents, which reads better than centre + size here.
function span(parent, material, x0, x1, y0, y1, z0, z1, shadow = true) {
    const mesh = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = mesh.receiveShadow = shadow;
    parent.add(mesh);
    return mesh;
}

function rod(parent, material, a, b, radius) {
    const from = new T.Vector3(...a);
    const to = new T.Vector3(...b);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, from.distanceTo(to), 10), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
}

function canvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
}

function glowSprite(parent, texture, color, size, x, y, z) {
    const sprite = new T.Sprite(
        new T.SpriteMaterial({ map: texture, color, blending: T.AdditiveBlending, depthWrite: false, transparent: true })
    );
    sprite.scale.setScalar(size);
    sprite.position.set(x, y, z);
    parent.add(sprite);
    return sprite;
}

// ---------- the city outside the window ----------

function litShare(hour) {
    if (hour >= 20 || hour < 5) return 0.55;
    if (hour >= 17 || hour < 8) return 0.36;
    return 0.08;
}

// The sky, the window light and the room's base brightness follow the
// visitor's clock.
function daylight(hour) {
    if (hour >= 20 || hour < 5)
        return { top: '#04060f', low: '#1b1d3a', tower: '#070a13', light: [0.42, 0.52, 1.0], power: 7, ambient: 1.1 };
    if (hour >= 17 || hour < 8)
        return { top: '#1b2148', low: '#d0683e', tower: '#120f1c', light: [1.0, 0.58, 0.34], power: 10, ambient: 1.3 };
    return { top: '#3c6cab', low: '#b4cde4', tower: '#2a3542', light: [0.86, 0.92, 1.0], power: 14, ambient: 1.8 };
}

function buildCity() {
    const hour = new Date().getHours();
    const sky = daylight(hour);
    let seed = 11;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const panes = [];
    const towers = [];
    for (let layer = 0; layer < 2; layer++) {
        let x = -20;
        while (x < 1024) {
            const w = 34 + random() * 70;
            const h = (layer ? 90 : 150) + random() * (layer ? 170 : 150);
            towers.push({ x, w, h, layer });
            for (let px = x + 6; px < x + w - 8; px += 11)
                for (let py = 512 - h + 8; py < 500; py += 13)
                    if (random() < 0.8) panes.push({ x: px, y: py, lit: false, warm: random() < 0.7 });
            x += w + random() * 14;
        }
    }
    const share = litShare(hour);
    for (const pane of panes) pane.lit = random() < share;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const drawPane = (pane) => {
        ctx.fillStyle = pane.lit ? (pane.warm ? '#ffd68a' : '#a8e6ff') : sky.tower;
        ctx.fillRect(pane.x, pane.y, 6, 7);
    };
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, sky.top);
    gradient.addColorStop(0.85, sky.low);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    for (const tower of towers) {
        ctx.fillStyle = sky.tower;
        ctx.globalAlpha = tower.layer ? 1 : 0.7;
        ctx.fillRect(tower.x, 512 - tower.h, tower.w, tower.h);
    }
    ctx.globalAlpha = 1;
    panes.forEach(drawPane);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;

    // People come home and go to bed: one pane changes now and then, drifting
    // toward the share the current hour calls for.
    function drift() {
        const target = litShare(new Date().getHours());
        const lit = panes.reduce((n, pane) => n + pane.lit, 0) / panes.length;
        const pane = panes[Math.floor(Math.random() * panes.length)];
        pane.lit = lit < target ? true : lit > target + 0.06 ? false : !pane.lit;
        drawPane(pane);
        texture.needsUpdate = true;
    }
    return { texture, sky, drift };
}

// ---------- scene ----------

function buildRoom(scene) {
    const room = new T.Group();
    scene.add(room);
    const parts = { room };

    const glow = canvasTexture(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
    });
    parts.glow = glow;

    const wall = std(0x39404d, 0.95);
    const wood = std(0x7a5236, 0.55);
    const darkWood = std(0x3a2a20, 0.7);
    const metal = std(0x23272d, 0.45, 0.6);
    const black = std(0x101216, 0.6);
    const beige = std(0xa39b88, 0.65);

    // Shell. The back wall is four pieces around the window opening.
    const WX0 = -1.6, WX1 = -0.55, WY0 = 0.3, WY1 = 1.3, WZ = -0.85;
    span(room, wall, -2.1, WX0, -0.74, 1.9, WZ - 0.1, WZ);
    span(room, wall, WX1, 2.1, -0.74, 1.9, WZ - 0.1, WZ);
    span(room, wall, WX0, WX1, -0.74, WY0, WZ - 0.1, WZ);
    span(room, wall, WX0, WX1, WY1, 1.9, WZ - 0.1, WZ);
    span(room, wall, -2.2, -2.1, -0.74, 1.9, WZ - 0.1, 3.4);
    span(room, wall, 2.1, 2.2, -0.74, 1.9, WZ - 0.1, 3.4);
    const planks = canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#3b2c22';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 ? '#352820' : '#41312a';
            ctx.fillRect(i * 32 + 1, 0, 30, 256);
        }
    });
    planks.wrapS = planks.wrapT = T.RepeatWrapping;
    planks.repeat.set(5, 5);
    span(room, std(0xffffff, 0.6, 0, { map: planks }), -2.2, 2.2, -0.8, -0.74, WZ - 0.1, 3.4);

    // Window: frame, bars, sill, curtain and the city behind it.
    const frame = std(0x1b1f26, 0.6);
    span(room, frame, WX0, WX1, WY0 - 0.03, WY0, WZ - 0.09, WZ + 0.05);
    span(room, frame, WX0, WX1, WY1, WY1 + 0.03, WZ - 0.09, WZ + 0.02);
    span(room, frame, WX0 - 0.03, WX0, WY0, WY1, WZ - 0.09, WZ + 0.02);
    span(room, frame, WX1, WX1 + 0.03, WY0, WY1, WZ - 0.09, WZ + 0.02);
    const midX = (WX0 + WX1) / 2;
    span(room, frame, midX - 0.012, midX + 0.012, WY0, WY1, WZ - 0.06, WZ - 0.03);
    span(room, frame, WX0, WX1, 0.88, 0.904, WZ - 0.06, WZ - 0.03);
    const city = buildCity();
    parts.city = city;
    const outside = new T.Mesh(new T.PlaneGeometry(13, 7), new T.MeshBasicMaterial({ map: city.texture }));
    outside.position.set(-1.0, 2.3, -5);
    room.add(outside);
    const curtainGeometry = new T.PlaneGeometry(0.5, 1.3, 30, 1);
    const position = curtainGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * 46) * 0.022);
    curtainGeometry.computeVertexNormals();
    const curtain = new T.Mesh(curtainGeometry, std(0x23484a, 1, 0, { side: T.DoubleSide }));
    curtain.position.set(WX0 + 0.14, 0.82, WZ + 0.07);
    curtain.castShadow = curtain.receiveShadow = true;
    room.add(curtain);
    rod(room, frame, [WX0 - 0.15, 1.46, WZ + 0.07], [WX1 + 0.15, 1.46, WZ + 0.07], 0.008);

    const windowLight = new T.SpotLight(0xffffff, 1, 12, 0.5, 0.5, 1.4);
    windowLight.color.setRGB(...city.sky.light);
    windowLight.position.set(-1.9, 2.3, -3.2);
    windowLight.target.position.set(-0.1, -0.5, 0.7);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(1024, 1024);
    windowLight.shadow.camera.near = 1;
    windowLight.shadow.camera.far = 9;
    windowLight.shadow.bias = -0.0015;
    room.add(windowLight, windowLight.target);
    parts.windowLight = windowLight;

    // Desk.
    span(room, wood, -1.25, 1.25, -0.04, 0, -0.5, 0.55);
    span(room, darkWood, -1.22, -1.18, -0.74, -0.04, -0.46, 0.5);
    span(room, darkWood, 0.72, 1.2, -0.74, -0.04, -0.46, 0.5);
    for (let i = 0; i < 3; i++) span(room, metal, 0.9, 1.02, -0.2 - i * 0.2, -0.185 - i * 0.2, 0.5, 0.51, false);
    span(room, black, -0.42, 0.42, 0, 0.003, 0.13, 0.46, false).receiveShadow = true;

    // Keyboard, mouse, mug.
    span(room, std(0x8c8676, 0.7), -0.22, 0.22, 0.003, 0.02, 0.19, 0.34);
    const keys = canvasTexture(512, 160, (ctx) => {
        ctx.fillStyle = '#8c8676';
        ctx.fillRect(0, 0, 512, 160);
        for (let row = 0; row < 5; row++)
            for (let col = 0; col < 15; col++) {
                if (row === 4 && col > 3 && col < 10) continue;
                ctx.fillStyle = (row + col) % 7 === 0 ? '#6f6a5e' : '#c9c3b2';
                ctx.fillRect(8 + col * 33.3, 8 + row * 30, 28, 25);
            }
        ctx.fillStyle = '#c9c3b2';
        ctx.fillRect(8 + 4 * 33.3, 128, 6 * 33.3 - 5, 25);
    });
    const keyTop = new T.Mesh(new T.PlaneGeometry(0.43, 0.14), std(0xffffff, 0.8, 0, { map: keys }));
    keyTop.rotation.x = -Math.PI / 2;
    keyTop.position.set(0, 0.0205, 0.265);
    keyTop.receiveShadow = true;
    room.add(keyTop);
    span(room, std(0x9a9483, 0.6), 0.3, 0.355, 0.003, 0.03, 0.23, 0.32);
    const mug = new T.Mesh(new T.CylinderGeometry(0.038, 0.034, 0.09, 20), std(0xd8d2c4, 0.4));
    mug.position.set(-0.56, 0.045, 0.2);
    mug.castShadow = true;
    room.add(mug);

    // Lamp: base, two arms, shade, bulb and the light it throws on the desk.
    const lamp = new T.Group();
    room.add(lamp);
    const lampMetal = std(0x2c3138, 0.4, 0.7);
    const base = new T.Mesh(new T.CylinderGeometry(0.07, 0.075, 0.016, 24), lampMetal);
    base.position.set(-0.62, 0.008, -0.3);
    base.castShadow = true;
    lamp.add(base);
    const elbow = [-0.7, 0.3, -0.36];
    const head = [-0.47, 0.4, -0.24];
    rod(lamp, lampMetal, [-0.62, 0.016, -0.3], elbow, 0.007);
    rod(lamp, lampMetal, elbow, head, 0.007);
    const joint = new T.Mesh(new T.SphereGeometry(0.014, 12, 8), lampMetal);
    joint.position.set(...elbow);
    lamp.add(joint);
    const aim = new T.Vector3(-0.36, 0, -0.1);
    const headAt = new T.Vector3(...head);
    const down = aim.clone().sub(headAt).normalize();
    const shade = new T.Mesh(
        new T.CylinderGeometry(0.018, 0.055, 0.085, 24, 1, true),
        std(0x2f5d52, 0.5, 0.3, { side: T.DoubleSide })
    );
    shade.position.copy(headAt).addScaledVector(down, 0.03);
    shade.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), down);
    shade.castShadow = true;
    lamp.add(shade);
    const bulb = new T.Mesh(new T.SphereGeometry(0.018, 12, 8), glowMaterial(4, 3, 1.6));
    bulb.position.copy(headAt).addScaledVector(down, 0.05);
    lamp.add(bulb);
    const bulbGlow = glowSprite(lamp, glow, 0xffc98a, 0.22, bulb.position.x, bulb.position.y, bulb.position.z);
    const lampLight = new T.SpotLight(0xffc27a, 1, 3, 0.62, 0.7, 1.8);
    lampLight.position.copy(headAt).addScaledVector(down, 0.04);
    lampLight.target.position.copy(aim);
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.set(1024, 1024);
    lampLight.shadow.camera.near = 0.06;
    lampLight.shadow.camera.far = 2.5;
    lampLight.shadow.bias = -0.002;
    lamp.add(lampLight, lampLight.target);
    Object.assign(parts, { bulb, bulbGlow, lampLight });

    // Speaker, left of the monitor.
    const speaker = new T.Group();
    room.add(speaker);
    span(speaker, black, -0.065, 0.065, 0, 0.23, -0.07, 0.07);
    const cones = [0.155, 0.06].map((y, i) => {
        const cone = new T.Mesh(new T.CircleGeometry(i ? 0.036 : 0.022, 24), std(0x3a3f47, 0.5, 0.2));
        cone.position.set(0, y, 0.0705);
        speaker.add(cone);
        const ring = new T.Mesh(new T.TorusGeometry(i ? 0.036 : 0.022, 0.003, 8, 28), metal);
        ring.position.copy(cone.position);
        speaker.add(ring);
        return cone;
    });
    Object.assign(parts, { speaker, cones });

    // Gear stack, right of the monitor: drives, fans, level meter.
    const stack = new T.Group();
    room.add(stack);
    const W2 = 0.085, FZ = 0.07;
    span(stack, metal, -W2, W2, 0, 0.07, -FZ, FZ);
    span(stack, metal, -W2, W2, 0.074, 0.166, -FZ, FZ);
    span(stack, metal, -W2, W2, 0.17, 0.252, -FZ, FZ);
    span(stack, black, -W2 - 0.004, W2 + 0.004, 0.252, 0.258, -FZ - 0.004, FZ + 0.004);
    const drives = [];
    for (let i = 0; i < 3; i++) {
        const y = 0.012 + i * 0.02;
        span(stack, black, -W2 + 0.01, W2 - 0.03, y, y + 0.012, FZ, FZ + 0.002, false);
        const led = new T.Mesh(new T.BoxGeometry(0.006, 0.006, 0.002), glowMaterial(0.2, 1.2, 0.5));
        led.position.set(W2 - 0.016, y + 0.006, FZ + 0.002);
        stack.add(led);
        const halo = glowSprite(stack, glow, 0x5dffa0, 0.03, led.position.x, led.position.y, FZ + 0.006);
        drives.push({ led, halo });
    }
    const fans = [-0.04, 0.04].map((x, i) => {
        const well = new T.Mesh(new T.CircleGeometry(0.034, 28), black);
        well.position.set(x, 0.12, FZ + 0.0005);
        stack.add(well);
        const ring = new T.Mesh(new T.TorusGeometry(0.034, 0.003, 8, 32), std(0x5a626c, 0.4, 0.7));
        ring.position.set(x, 0.12, FZ + 0.002);
        stack.add(ring);
        const fan = new T.Group();
        fan.position.set(x, 0.12, FZ + 0.003);
        for (let blade = 0; blade < 3; blade++) {
            const mesh = new T.Mesh(new T.BoxGeometry(0.058, 0.011, 0.001), std(0x7b848f, 0.4, 0.5));
            mesh.rotation.z = (blade * Math.PI) / 3;
            fan.add(mesh);
        }
        fan.userData.direction = i ? -1 : 1;
        stack.add(fan);
        return fan;
    });
    span(stack, black, -W2 + 0.012, W2 - 0.012, 0.18, 0.243, FZ, FZ + 0.001, false);
    const meters = [];
    for (let i = 0; i < 7; i++) {
        const geometry = new T.BoxGeometry(0.013, 0.05, 0.002);
        geometry.translate(0, 0.025, 0);
        const bar = new T.Mesh(geometry, glowMaterial(0.25, 1.5, 0.6));
        bar.position.set(-0.054 + i * 0.018, 0.186, FZ + 0.002);
        bar.scale.y = 0.4;
        stack.add(bar);
        meters.push(bar);
    }
    const meterGlow = glowSprite(stack, glow, 0x3cff8c, 0.2, 0, 0.21, FZ + 0.02);
    meterGlow.material.opacity = 0.35;
    Object.assign(parts, { stack, drives, fans, meters });

    // Neon prompt on the wall, a shelf of books under it.
    const neon = new T.Group();
    room.add(neon);
    const chevron = glowMaterial(3.2, 0.5, 3.6);
    const underscore = glowMaterial(0.4, 3.2, 3.4);
    rod(neon, chevron, [-0.12, 0.09, 0], [-0.02, 0, 0], 0.008).castShadow = false;
    rod(neon, chevron, [-0.02, 0, 0], [-0.12, -0.09, 0], 0.008).castShadow = false;
    const cursor = rod(neon, underscore, [0.02, -0.09, 0], [0.13, -0.09, 0], 0.008);
    cursor.castShadow = false;
    const neonGlowA = glowSprite(neon, glow, 0xd04bff, 0.5, -0.07, 0, 0.02);
    const neonGlowB = glowSprite(neon, glow, 0x35e8ff, 0.34, 0.075, -0.09, 0.02);
    const neonLight = new T.PointLight(0x9a6bff, 1, 3, 1.8);
    neonLight.position.set(0, 0, 0.12);
    neon.add(neonLight);
    Object.assign(parts, { neon, chevron, underscore, neonGlowA, neonGlowB, neonLight });

    const shelf = new T.Group();
    room.add(shelf);
    span(shelf, darkWood, -0.34, 0.34, -0.02, 0, 0, 0.16);
    const spines = [0x8a3b3b, 0x2f6a5c, 0xc7a04a, 0x3b4f8a, 0x7a4a8a, 0x9b6a3b, 0x2f5a7a, 0x555b66];
    let bx = -0.31;
    spines.forEach((color, i) => {
        const w = 0.022 + ((i * 7) % 5) * 0.004;
        const h = 0.15 + ((i * 5) % 4) * 0.018;
        span(shelf, std(color, 0.8), bx, bx + w, 0, h, 0.01, 0.13);
        bx += w + 0.002;
    });
    span(shelf, metal, 0.12, 0.3, 0, 0.07, 0.02, 0.14);
    parts.shelf = shelf;

    return parts;
}

function buildMonitor(group, m) {
    for (const child of [...group.children]) {
        group.remove(child);
        child.geometry?.dispose();
    }
    const { gw, gh, bl, br, bt, bb, stand } = m;
    const beige = S.materials.beige;
    const dark = S.materials.dark;
    const FRONT = 0.014, BACK = -0.05;
    const x0 = -gw / 2 - bl, x1 = gw / 2 + br, y0 = -gh / 2 - bb, y1 = gh / 2 + bt;
    span(group, beige, x0, -gw / 2, y0, y1, BACK, FRONT);
    span(group, beige, gw / 2, x1, y0, y1, BACK, FRONT);
    span(group, beige, -gw / 2, gw / 2, gh / 2, y1, BACK, FRONT);
    span(group, beige, -gw / 2, gw / 2, y0, -gh / 2, BACK, FRONT);
    const screen = new T.Mesh(new T.PlaneGeometry(gw, gh), S.materials.screen);
    group.add(screen);
    // Tube housing.
    span(group, beige, x0 * 0.92, x1 * 0.92, y0 * 0.86, y1 * 0.9, -0.3, BACK);
    span(group, beige, x0 * 0.62, x1 * 0.62, y0 * 0.6, y1 * 0.62, -0.42, -0.3);
    // Stand.
    span(group, dark, -0.055, 0.055, y0 - stand, y0, -0.17, -0.05);
    span(group, beige, -gw * 0.3, gw * 0.3, y0 - stand, y0 - stand + 0.014, -0.25, 0.05);
    // Chin: vents, dials, power light.
    const cy = (y0 - gh / 2) / 2;
    const size = Math.min(bb, 0.06);
    for (let i = 0; i < 7; i++)
        span(group, dark, -gw * 0.16 + i * gw * 0.024, -gw * 0.16 + i * gw * 0.024 + gw * 0.014, cy - size * 0.1, cy + size * 0.1, FRONT, FRONT + 0.001, false);
    for (let i = 0; i < 2; i++) {
        const dial = new T.Mesh(new T.CylinderGeometry(size * 0.17, size * 0.17, 0.008, 18), dark);
        dial.rotation.x = Math.PI / 2;
        dial.position.set(gw * (0.27 + i * 0.07), cy, FRONT + 0.004);
        group.add(dial);
    }
    const led = new T.Mesh(new T.SphereGeometry(size * 0.07, 10, 8), S.materials.power);
    led.position.set(gw / 2 - size * 0.2, cy, FRONT + 0.002);
    group.add(led);
    S.powerHalo.position.set(led.position.x, led.position.y, FRONT + 0.01);
    S.powerHalo.scale.setScalar(size * 0.9);
    group.add(S.powerHalo);
}

// ---------- layout: fit the model to the DOM ----------

function measure() {
    const { shell, glass } = S;
    const previous = shell.style.transform;
    shell.style.transform = 'none';
    const s = shell.getBoundingClientRect();
    const g = glass.getBoundingClientRect();
    shell.style.transform = previous;
    return { s, g, W: window.innerWidth, H: window.innerHeight };
}

function layout() {
    const { s, g, W, H } = measure();
    if (!g.width || !g.height) return;
    const wide = desktop.matches;
    const u = Math.max(g.height, g.width * 0.75) / SCREEN_HEIGHT;
    const dm = (CAMERA_DISTANCE * H) / u;
    const vmin = Math.min(W, H);
    const m = {
        gw: g.width / u,
        gh: g.height / u,
        bl: wide ? (g.left - s.left) / u : 0.02,
        br: wide ? (s.right - g.right) / u : 0.02,
        bt: wide ? (g.top - s.top) / u : 0.02,
        bb: wide ? (s.bottom - g.bottom) / u : 0.05,
        stand: wide ? clamp(vmin * 0.045, 30, 64) / u : 0.03
    };
    const cx = (g.left + g.width / 2 - W / 2) / u;
    const cy = (H / 2 - (g.top + g.height / 2)) / u;
    Object.assign(S, { W, H, u, dm, shellLeft: s.left, shellTop: s.top, centre: new T.Vector3(cx, cy, 0) });

    S.monitor.position.set(cx, cy, 0);
    buildMonitor(S.monitor, m);
    S.screenLight.position.set(cx, cy, 0.03);
    S.screenLight.target.position.set(cx, cy - 0.25, 1);
    S.screenSpill.position.set(cx, cy, 0.3);
    S.fill.position.set(cx + 0.5, cy + 0.7, 1.7);
    const deskY = cy - m.gh / 2 - m.bb - m.stand;
    const { room, stack, speaker, neon, shelf } = S.parts;
    room.position.set(cx, deskY, 0);

    // Objects that must be seen while reading sit in the margins beside the
    // monitor: place and size them from the margin's width at their depth.
    const margin = wide ? Math.min(g.left, W - g.right) - (g.left - s.left) : 0;
    const depthScale = (z) => (dm - z) / dm;
    const edge = (m.gw / 2 + m.br) * u;
    const place = (group, side, z, width, fill, y = 0, turn = false) => {
        if (margin > 70) {
            const centre = ((edge + margin / 2) / u) * depthScale(z);
            group.scale.setScalar(clamp(((margin * fill) / u) * depthScale(z) / width, 0.7, 1.9));
            group.position.set(side * centre, y, z);
            if (turn) group.rotation.y = Math.atan2(-side * centre, dm - z) * 0.85;
        } else {
            group.rotation.y = 0;
            group.scale.setScalar(1);
            group.position.set(side * (m.gw / 2 + 0.3), y, z);
        }
    };
    place(stack, 1, -0.3, 0.2, 0.8, 0, true);
    place(speaker, -1, -0.36, 0.16, 0.55, 0, true);
    const wallZ = -0.84;
    const up = (fraction) => ((fraction * H) / u) * depthScale(wallZ) + cy - deskY;
    place(neon, 1, wallZ, 0.3, 0.72, margin > 70 ? up(0.33) : 0.95);
    place(shelf, 1, wallZ - 0.01, 0.68, 1.5, margin > 70 ? up(0.1) : 0.62);

    // Camera poses away from rest, framed relative to the monitor.
    const pose = (dx, dy, distance, tx, ty) => {
        const position = new T.Vector3(dx, dy, 1).normalize().multiplyScalar(dm * distance).add(S.centre);
        const target = S.centre.clone().add(new T.Vector3(tx, ty, 0));
        const quaternion = new T.Quaternion().setFromRotationMatrix(
            new T.Matrix4().lookAt(position, target, new T.Vector3(0, 1, 0))
        );
        return { position, quaternion, target };
    };
    S.poses = {
        entrance: pose(wide ? -0.6 : -0.42, 0.34, wide ? 3.1 : 3.0, wide ? 0.1 : 0, 0.02),
        look: pose(wide ? 0.5 : 0.4, 0.36, wide ? 3.5 : 3.2, wide ? 0.06 : 0, 0.06)
    };

    const ratio = S.lean ? 0.7 : Math.min(window.devicePixelRatio || 1, S.still ? 1 : wide ? 2 : 1.5);
    S.renderer.setPixelRatio(ratio);
    S.renderer.setSize(W, H, false);
    S.renderer.shadowMap.needsUpdate = true;
    invalidate();
}

// ---------- camera ----------

// k = 1 is the reading position. Below 1 the camera sits between a pose and
// rest and the shell is carried along with a matrix3d.
function cameraState() {
    if (S.entrance < 1) return { pose: S.poses.entrance, k: S.entrance };
    if (S.lookT > 0) return { pose: S.poses.look, k: 1 - ease(S.lookT) };
    return { pose: null, k: 1 };
}

function placeCamera() {
    const { camera, dm, W, H, u } = S;
    const { pose, k } = cameraState();
    const ex = S.px * 0.05 * k;
    const ey = -S.py * 0.03 * k;
    const rest = S.tmp.set(ex, ey, dm);
    if (pose) {
        camera.position.copy(pose.position);
        if (S.lookT > 0) {
            // Look-around: the pointer swings the camera a little.
            camera.position.x += S.px * 0.28;
            camera.position.y -= S.py * 0.14;
            camera.quaternion.setFromRotationMatrix(
                S.matrix.lookAt(camera.position, pose.target, camera.up)
            );
            S.poseQuaternion.copy(camera.quaternion);
        } else S.poseQuaternion.copy(pose.quaternion);
        camera.position.lerp(rest, k);
        camera.quaternion.copy(S.poseQuaternion).slerp(S.identity, k);
    } else {
        camera.position.copy(rest);
        camera.quaternion.copy(S.identity);
    }
    const n = NEAR / dm;
    const halfW = W / 2 / u, halfH = H / 2 / u;
    camera.projectionMatrix.makePerspective((-halfW - ex) * n, (halfW - ex) * n, (halfH - ey) * n, (-halfH - ey) * n, NEAR, FAR);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld(true);
    carryShell(k);
    return k;
}

function carryShell(k) {
    const { shell, camera, W, H, u, shellLeft: L, shellTop: Tp } = S;
    if (k >= 1) {
        if (S.carried) {
            shell.style.removeProperty('transform');
            shell.style.removeProperty('transform-origin');
            S.carried = false;
        }
        return;
    }
    // Shell-local pixels -> world -> clip -> viewport pixels, relative to the
    // shell's own layout corner. CSS does the perspective divide.
    const c = S.matrix
        .set(1 / u, 0, 0, (L - W / 2) / u, 0, -1 / u, 0, (H / 2 - Tp) / u, 0, 0, 1, 0, 0, 0, 0, 1)
        .premultiply(camera.matrixWorldInverse)
        .premultiply(camera.projectionMatrix).elements;
    const out = new Array(16);
    for (let col = 0; col < 4; col++) {
        const x = c[col * 4], y = c[col * 4 + 1], w = c[col * 4 + 3];
        out[col * 4] = 0.5 * W * x + (0.5 * W - L) * w;
        out[col * 4 + 1] = -0.5 * H * y + (0.5 * H - Tp) * w;
        out[col * 4 + 2] = col === 2 ? 1 : 0;
        out[col * 4 + 3] = w;
    }
    const scale = 1 / out[15];
    shell.style.transformOrigin = '0 0';
    shell.style.transform = `matrix3d(${out.map((v) => +(v * scale).toFixed(7)).join(',')})`;
    S.carried = true;
}

// ---------- frame loop ----------

function visible() {
    return !document.hidden && (desktop.matches || S.entrance < 1 || S.lookT > 0);
}

function invalidate() {
    if (!S) return;
    S.dirty = true;
    if (!S.raf) S.raf = requestAnimationFrame(tick);
}

function approach(current, target, dt, tau) {
    const next = current + (target - current) * (1 - Math.exp(-dt / tau));
    return Math.abs(target - next) < 0.004 ? target : next;
}

function tick(now) {
    S.raf = 0;
    if (dead || !S) return;
    const dt = Math.min(0.1, (now - S.last) / 1000 || 0);
    S.last = now;
    let busy = false;

    // Look-around animation.
    if (S.lookT !== S.lookTarget) {
        const step = reduced.matches ? 1 : (dt * 1000) / LOOK_MS;
        S.lookT = S.lookTarget > S.lookT ? Math.min(1, S.lookT + step) : Math.max(0, S.lookT - step);
        busy = true;
        if (S.lookT === 0) delete root.dataset.roomLook;
    }

    // Light mood: the monitor's glow and the room lights fade toward targets.
    const power = approach(S.power, S.powerTarget, dt, 0.18);
    const lights = approach(S.lights, S.lightsTarget, dt, 0.45);
    if (power !== S.power || lights !== S.lights) busy = true;
    S.power = power;
    S.lights = lights;

    const fx = (name) => now < (S.fx[name] || 0);
    const p = S.parts;
    // A tube striking: it stutters while the lights come up, and on a jolt.
    const striking = (lights > 0.03 && lights < 0.97) || fx('neon');
    const stutter = striking ? (Math.floor(now / 45) * 7919) % 5 < 2 ? 0.15 : 1 : 1;
    const neonLevel = lights * stutter;
    const blink = S.ambient ? (Math.floor(now / 550) % 2 ? 0.2 : 1) : 1;
    p.chevron.color.setRGB(3.2 * neonLevel + 0.06, 0.5 * neonLevel + 0.02, 3.6 * neonLevel + 0.07);
    p.underscore.color.setRGB(0.4 * neonLevel * blink + 0.02, 3.2 * neonLevel * blink + 0.06, 3.4 * neonLevel * blink + 0.07);
    p.neonGlowA.material.opacity = 0.75 * neonLevel;
    p.neonGlowB.material.opacity = 0.7 * neonLevel * blink;
    p.neonLight.intensity = 0.42 * neonLevel;

    const lamp = S.lamp ? lights : 0;
    p.lampLight.intensity = 0.8 * lamp;
    p.bulb.material.color.setRGB(4 * lamp + 0.08, 3 * lamp + 0.07, 1.6 * lamp + 0.05);
    p.bulbGlow.material.opacity = 0.8 * lamp;

    const pulse = fx('pulse') ? 1 + 0.9 * ((S.fx.pulse - now) / 600) : 1;
    S.screenLight.intensity = S.screenBase * 2.2 * power * pulse;
    S.screenSpill.intensity = S.screenBase * 0.16 * power * pulse;
    S.ambientLight.intensity = S.ambientBase * (0.35 + 0.65 * lights);
    S.fill.intensity = S.ambientBase * 1.3 * lights;
    S.materials.power.color.setRGB(0.1, fx('power') ? 4 : 0.5 + 1.2 * power, fx('power') ? 2 : 0.4);
    S.powerHalo.material.opacity = fx('power') ? 1 : 0.2 + 0.4 * power;

    p.drives.forEach((drive, i) => {
        const on = fx(`drive${i}`) ? Math.floor(now / 50) % 2 === 0 : false;
        drive.led.material.color.setRGB(on ? 2.4 : 0.1, on ? 4 : 0.7, on ? 2.6 : 0.3);
        drive.halo.material.opacity = on ? 1 : 0.3;
    });
    const thump = fx('speaker') ? 1 + 0.12 * Math.sin(((S.fx.speaker - now) / 360) * Math.PI) : 1;
    p.cones.forEach((cone) => cone.scale.setScalar(thump));
    if (Object.keys(S.fx).some(fx)) busy = true;

    // Ambient motion: fans turn at the swarm's pace, the neon cursor blinks.
    S.ambient = !S.still && !reduced.matches && visible();
    if (S.ambient) for (const fan of p.fans) fan.rotation.z += fan.userData.direction * S.fanRate * 5 * dt;

    const k = placeCamera();
    if (S.px !== S.pxDrawn || S.py !== S.pyDrawn || k !== S.kDrawn) S.dirty = true;
    const ambientFrame = S.ambient && (S.frame = (S.frame + 1) % 2) === 0;
    if (visible() && (S.dirty || busy || ambientFrame)) {
        S.renderer.render(S.scene, S.camera);
        S.dirty = false;
        S.pxDrawn = S.px;
        S.pyDrawn = S.py;
        S.kDrawn = k;
    }
    if (busy || S.ambient) S.raf = requestAnimationFrame(tick);
}

// ---------- lifecycle ----------

function build(canvas, gl) {
    const renderer = new T.WebGLRenderer({ canvas, context: gl, antialias: true });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;

    const scene = new T.Scene();
    scene.background = new T.Color(0x020306);
    const camera = new T.PerspectiveCamera();
    const parts = buildRoom(scene);
    const sky = parts.city.sky;
    parts.windowLight.intensity = sky.power;

    const ambientLight = new T.HemisphereLight(0x7f93bd, 0x2a211b, 1);
    scene.add(ambientLight);
    // The screen throws its light forward over the desk; a weak point light
    // stands in for what spills sideways onto the gear beside it.
    const screenLight = new T.SpotLight(0x63e6a4, 1, 4, 1.35, 1, 1.5);
    const screenSpill = new T.PointLight(0x63e6a4, 1, 2.5, 1.8);
    scene.add(screenLight, screenLight.target, screenSpill);
    // What the rest of the room bounces back at the front of the desk.
    const fill = new T.PointLight(0xc3cbe0, 1, 6, 1.6);
    scene.add(fill);
    const monitor = new T.Group();
    scene.add(monitor);
    const materials = {
        beige: std(0xa39b88, 0.65),
        dark: std(0x1a1d22, 0.6),
        screen: new T.MeshBasicMaterial({ color: 0x050607 }),
        power: glowMaterial(0.1, 1.6, 0.4)
    };
    const powerHalo = new T.Sprite(
        new T.SpriteMaterial({ map: parts.glow, color: 0x5dffa0, blending: T.AdditiveBlending, depthWrite: false, transparent: true })
    );

    S = {
        canvas, renderer, scene, camera, parts, monitor, materials, powerHalo, ambientLight, screenLight, screenSpill, fill,
        shell: document.getElementById('monitor-shell'),
        glass: document.getElementById('monitor-glass'),
        ambientBase: sky.ambient, screenBase: 0.5,
        entrance: 1, lookT: 0, lookTarget: 0, px: 0, py: 0,
        power: 1, powerTarget: 1, lights: 1, lightsTarget: 1, lamp: true,
        fanRate: 0.25, fx: {}, frame: 0, last: 0, raf: 0, dirty: true, still: false, ambient: false, carried: false,
        tmp: new T.Vector3(), target: new T.Vector3(), matrix: new T.Matrix4(),
        identity: new T.Quaternion(), poseQuaternion: new T.Quaternion(),
        events: new AbortController()
    };
    const signal = S.events.signal;
    readTheme();
    layout();

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => S && layout());
    }, { signal });
    document.addEventListener('visibilitychange', invalidate, { signal });
    window.addEventListener('theme-changed', () => requestAnimationFrame(readTheme), { signal });
    canvas.addEventListener('webglcontextlost', () => room3d.destroy(), { signal });
    S.cityTimer = setInterval(() => {
        if (!S.ambient) return;
        parts.city.drift();
        invalidate();
    }, 9000);

    // Pressing the room (anything outside the monitor) steps back to look at it.
    window.addEventListener('pointerdown', (event) => {
        if (S.lookTarget) return;
        if (event.target !== document.body && event.target !== root) return;
        if (!desktop.matches || event.button !== 0) return;
        room3d.look(true);
    }, { signal });
}

// The screen lights the room in its own colour: green on the dark theme,
// near white on the light one.
function readTheme() {
    if (!S) return;
    const match = getComputedStyle(S.glass).backgroundColor.match(/[\d.]+/g) || [0, 0, 0];
    const luminance = (0.2126 * match[0] + 0.7152 * match[1] + 0.0722 * match[2]) / 255;
    const light = luminance > 0.5;
    S.screenLight.color.set(light ? 0xe6efe4 : 0x63e6a4);
    S.screenSpill.color.copy(S.screenLight.color);
    S.screenBase = light ? 0.95 : 0.5;
    S.materials.screen.color.set(light ? 0xd9ddd6 : 0x050607);
    invalidate();
}

function endLook() {
    if (S?.lookTarget) room3d.look(false);
}

export const room3d = {
    ready: false,

    // Resolves true when the 3D room is on screen, false when the CSS room
    // should be used instead.
    init() {
        if (initPromise) return initPromise;
        initPromise = (async () => {
            if (!('room3d' in root.dataset)) return false;
            try {
                const canvas = document.getElementById('room3d');
                const force = new URLSearchParams(location.search).get('room3d') === 'force';
                const gl = canvas.getContext('webgl2', {
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                    failIfMajorPerformanceCaveat: !force
                });
                if (!gl) throw new Error('webgl2 unavailable');
                // A software rasteriser cannot hold the frame rate; some browsers
                // do not report it as a performance caveat.
                const info = gl.getExtension('WEBGL_debug_renderer_info');
                const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
                if (!force && /swiftshader|llvmpipe|software/i.test(name)) throw new Error('software renderer');
                T = await import(VENDOR);
                if (dead) return false;
                build(canvas, gl);
                root.dataset.room3d = 'on';
                room3d.ready = true;
                return true;
            } catch (error) {
                console.warn('3D room unavailable:', error.message);
                fail();
                return false;
            }
        })();
        return initPromise;
    },

    // Entrance progress: 0 is the wide shot, 1 is the reading position.
    setCamera(progress) {
        if (!S) return;
        S.entrance = clamp(progress, 0, 1);
        if (S.entrance < 1 && S.lookTarget) {
            S.lookT = S.lookTarget = 0;
            delete root.dataset.roomLook;
        }
        placeCamera();
        invalidate();
    },

    // Pointer position in -1..1; at rest it shifts the camera, not the screen.
    setParallax(x, y) {
        if (!S || (S.px === x && S.py === y)) return;
        S.px = x;
        S.py = y;
        invalidate();
    },

    // power: the monitor's glow. lights: lamp, neon and room fill. 0..1 each.
    setMood(power, lights, instant = false) {
        if (!S) return;
        S.powerTarget = power;
        S.lightsTarget = lights;
        if (instant || reduced.matches) {
            S.power = power;
            S.lights = lights;
        }
        invalidate();
    },

    setLevels(levels) {
        if (!S) return;
        S.parts.meters.forEach((bar, i) => (bar.scale.y = clamp(levels[i] ?? 0.4, 0.08, 1)));
        if (!S.ambient) invalidate();
    },

    setFan(rate) {
        if (S) S.fanRate = rate;
    },

    flash(name, ms) {
        if (!S) return;
        S.fx[name] = performance.now() + ms;
        invalidate();
    },

    setLamp(on) {
        if (!S) return;
        S.lamp = on;
        invalidate();
    },

    // Step back to see the whole room; any key or press returns.
    look(on = !S?.lookTarget) {
        if (!S || S.entrance < 1) return false;
        if (on && document.body.dataset.displayMode !== 'flat') return false;
        S.lookTarget = on ? 1 : 0;
        if (on) {
            root.dataset.roomLook = '';
            setTimeout(() => {
                if (!S?.lookTarget) return;
                for (const type of ['keydown', 'pointerdown'])
                    window.addEventListener(type, endLook, { capture: true, once: true, signal: S.events.signal });
            }, 0);
        }
        invalidate();
        return true;
    },

    get looking() {
        return !!S?.lookTarget;
    },

    // Frames ran slow: stop ambient motion and drop to one sample per pixel.
    still() {
        if (!S || S.still) return false;
        S.still = true;
        layout();
        return true;
    },

    // Still too slow: give the page back to the CSS room for this tab.
    abandon() {
        if (!S) return false;
        room3d.destroy();
        fail();
        return true;
    },

    // One rung down the performance ladder; false when nothing is left to give.
    step() {
        if (!S) return false;
        if (room3d.still()) return true;
        // Second rung: render below native resolution before giving the room up.
        if (!S.lean) return (S.lean = true), layout(), true;
        return room3d.abandon();
    },

    destroy() {
        dead = true;
        room3d.ready = false;
        delete root.dataset.room3d;
        delete root.dataset.roomLook;
        if (!S) return;
        cancelAnimationFrame(S.raf);
        clearInterval(S.cityTimer);
        S.events.abort();
        S.shell.style.removeProperty('transform');
        S.shell.style.removeProperty('transform-origin');
        S.renderer.dispose();
        S = null;
    }
};
