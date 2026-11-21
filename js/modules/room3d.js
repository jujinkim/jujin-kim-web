// The room in 3D. The terminal stays real DOM: the monitor model is built
// around the measured #monitor-glass rectangle and the resting camera uses an
// off-axis frustum that keeps the screen plane pixel-fixed, so text is never
// transformed while reading. Away from rest (entrance, look-around) the shell
// follows the camera through a CSS matrix3d.
//
// In the look-around view some things can be pressed: the monitor returns to
// reading, the handheld, the phone, the books and the window bring the camera
// up close.
//
// World units are metres. The origin is the viewport centre on the screen
// plane, +y is up and +z points at the viewer.

import { BOOK_LINKS } from '../constants.js?v=20261121.3';
import { currentDaylight, onDaylight } from './daylight.js?v=20261121.3';

const VENDOR = '../vendor/three.min.js?v=20261121.3';
const OFF_KEY = 'room3d-off';
const SCREEN_HEIGHT = 0.33;
const CAMERA_DISTANCE = 1.15; // in viewport heights
const NEAR = 0.05;
const FAR = 30;
const LOOK_MS = 1100;
const FOCUS_MS = 900;
// The room is drawn in chunky pixels: one rendered pixel per PIXEL CSS pixels.
const PIXEL = 2;
const PIXEL_LEAN = 4;
// Window opening in room coordinates.
const WINDOW = { x0: -1.6, x1: -0.55, y0: 0.3, y1: 1.3, z: -0.85 };
// Look-around orbit limits: yaw and pitch in radians, distance in rest distances.
const ORBIT = { yaw: 1.1, pitchMin: 0.03, pitchMax: 1.0, distMin: 1.5, distMax: 5.5 };
// Outline colour of the things that can be pressed.
const GLOW = [0.3, 1, 0.55];
// Screens that light up in a close-up, as [close-up, object, top left, top
// right, bottom left] in that object's space, and the size in CSS px of the
// DOM panel laid on each. In the room they are off.
const LCD = {
    top: ['console', 'lid', [-0.031, -0.0117, 0.06], [0.031, -0.0117, 0.06], [-0.031, -0.0117, 0.012], 248, 192],
    bottom: ['console', 'handheld', [-0.031, 0.0127, -0.024], [0.031, 0.0127, -0.024], [-0.031, 0.0127, 0.022], 248, 184],
    phone: ['phone', 'phone', [-0.034, 0.0082, -0.073], [0.034, 0.0082, -0.073], [-0.034, 0.0082, 0.073], 272, 584]
};

const root = document.documentElement;
const desktop = matchMedia('(min-width: 1000px) and (min-height: 600px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let T = null;
let initPromise = null;
let dead = false;
let S = null; // everything the running scene owns

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let gpuName = '';

function fail(reason) {
    delete root.dataset.room3d;
    try {
        sessionStorage.setItem(OFF_KEY, reason || 'unavailable');
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

// The sky itself is not painted here (see the window in buildRoom): only the
// towers, in the colour the hour gives them, and their lit windows.
function buildCity(day) {
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
    for (const pane of panes) pane.lit = random() < day.lit;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    let tower = '';
    let glow = 1;
    let texture = null;
    const drawPane = (pane) => {
        ctx.fillStyle = tower;
        ctx.fillRect(pane.x, pane.y, 6, 7);
        if (!pane.lit) return;
        // A lit window is plain to see at night and washed out by day.
        ctx.globalAlpha = glow;
        ctx.fillStyle = pane.warm ? '#ffd68a' : '#a8e6ff';
        ctx.fillRect(pane.x, pane.y, 6, 7);
        ctx.globalAlpha = 1;
    };
    // Repaints the city for the hour: the colour of its towers, and how many
    // windows are lit when the share has moved further than drift() follows.
    function paint(day) {
        let lit = panes.reduce((n, pane) => n + pane.lit, 0);
        const wanted = Math.round(day.lit * panes.length);
        let changed = Math.abs(lit - wanted) > panes.length * 0.02;
        for (let guard = panes.length * 20; changed && lit !== wanted && guard > 0; guard--) {
            const pane = panes[Math.floor(Math.random() * panes.length)];
            if (pane.lit === lit > wanted) lit += (pane.lit = !pane.lit) ? 1 : -1;
        }
        const level = 0.3 + 0.7 * day.dark;
        if (day.tower === tower && Math.abs(level - glow) < 0.01 && !changed) return;
        tower = day.tower;
        glow = level;
        ctx.clearRect(0, 0, 1024, 512);
        ctx.fillStyle = tower;
        for (const block of towers) ctx.fillRect(block.x, 512 - block.h, block.w, block.h);
        panes.forEach(drawPane);
        if (texture) texture.needsUpdate = true;
    }
    paint(day);
    texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;

    // People come home and go to bed: one pane changes now and then, drifting
    // toward the share the current hour calls for.
    function drift(target) {
        const lit = panes.reduce((n, pane) => n + pane.lit, 0) / panes.length;
        const pane = panes[Math.floor(Math.random() * panes.length)];
        pane.lit = lit < target ? true : lit > target + 0.06 ? false : !pane.lit;
        drawPane(pane);
        texture.needsUpdate = true;
    }
    return { texture, paint, drift };
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
    const midX = (WX0 + WX1) / 2;
    parts.windowFrame = [
        span(room, frame, WX0, WX1, WY0 - 0.03, WY0, WZ - 0.09, WZ + 0.05),
        span(room, frame, WX0, WX1, WY1, WY1 + 0.03, WZ - 0.09, WZ + 0.02),
        span(room, frame, WX0 - 0.03, WX0, WY0, WY1, WZ - 0.09, WZ + 0.02),
        span(room, frame, WX1, WX1 + 0.03, WY0, WY1, WZ - 0.09, WZ + 0.02),
        span(room, frame, midX - 0.012, midX + 0.012, WY0, WY1, WZ - 0.06, WZ - 0.03),
        span(room, frame, WX0, WX1, 0.88, 0.904, WZ - 0.06, WZ - 0.03)
    ];
    const city = buildCity(currentDaylight());
    parts.city = city;
    // The sky part of the texture is transparent and written as it is (no
    // blending), which leaves a hole in this canvas: the page behind it
    // supplies the sky and the swarm.
    const outside = new T.Mesh(
        new T.PlaneGeometry(13, 7),
        new T.MeshBasicMaterial({ map: city.texture, transparent: true, blending: 0, premultipliedAlpha: true, depthWrite: false })
    );
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
    parts.windowFrame.push(curtain);
    rod(room, frame, [WX0 - 0.15, 1.46, WZ + 0.07], [WX1 + 0.15, 1.46, WZ + 0.07], 0.008);

    // Placed and coloured by applyDaylight.
    const windowLight = new T.SpotLight(0xffffff, 1, 12, 0.5, 0.7, 1.4);
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

    // The computer itself: a beige tower on the floor under the desk.
    const TX0 = -1.1, TX1 = -0.9, TY0 = -0.74, TY1 = -0.3, TZ = 0.32;
    span(room, beige, TX0, TX1, TY0, TY1, TZ - 0.45, TZ);
    const bay = std(0x8d8674, 0.7);
    for (let i = 0; i < 2; i++) span(room, bay, TX0 + 0.02, TX1 - 0.02, TY1 - 0.085 - i * 0.055, TY1 - 0.04 - i * 0.055, TZ, TZ + 0.003, false);
    span(room, bay, TX0 + 0.04, TX1 - 0.04, TY1 - 0.19, TY1 - 0.16, TZ, TZ + 0.003, false);
    span(room, black, TX0 + 0.05, TX1 - 0.05, TY1 - 0.178, TY1 - 0.172, TZ + 0.003, TZ + 0.004, false);
    span(room, bay, TX0 + 0.03, TX0 + 0.06, TY1 - 0.27, TY1 - 0.24, TZ, TZ + 0.006, false);
    for (let i = 0; i < 6; i++) span(room, bay, TX0 + 0.03, TX1 - 0.03, TY0 + 0.04 + i * 0.018, TY0 + 0.046 + i * 0.018, TZ, TZ + 0.002, false);
    span(room, glowMaterial(0.2, 1.4, 0.5), TX1 - 0.07, TX1 - 0.058, TY1 - 0.262, TY1 - 0.25, TZ, TZ + 0.003, false);
    // Disk light: lit while any drive in the rack is busy.
    parts.towerLed = span(room, glowMaterial(0.3, 0.12, 0.05), TX1 - 0.045, TX1 - 0.033, TY1 - 0.262, TY1 - 0.25, TZ, TZ + 0.003, false);

    // Keyboard.
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
    // Trackball: a low square base with a large ball in the middle.
    span(room, std(0x17191d, 0.5), 0.265, 0.395, 0.003, 0.02, 0.2, 0.33);
    span(room, std(0x2a2d33, 0.4, 0.5), 0.3, 0.36, 0.02, 0.022, 0.235, 0.295, false);
    const ball = new T.Mesh(new T.SphereGeometry(0.028, 20, 14), std(0xb3161f, 0.18, 0.1));
    ball.position.set(0.33, 0.034, 0.265);
    ball.castShadow = true;
    room.add(ball);

    // A drink: a bottle and a poured glass with ice.
    const glassy = (color, opacity) => std(color, 0.08, 0, { transparent: true, opacity });
    const turned = (radiusTop, radiusBottom, height, material, x, y, z) => {
        const mesh = new T.Mesh(new T.CylinderGeometry(radiusTop, radiusBottom, height, 18), material);
        mesh.position.set(x, y + height / 2, z);
        mesh.castShadow = true;
        room.add(mesh);
        return mesh;
    };
    const BX = -0.7, BZ = 0.06;
    turned(0.034, 0.034, 0.15, glassy(0x8a4a12, 0.8), BX, 0, BZ);
    turned(0.012, 0.034, 0.035, glassy(0x8a4a12, 0.8), BX, 0.15, BZ);
    turned(0.012, 0.012, 0.045, glassy(0x8a4a12, 0.8), BX, 0.185, BZ);
    turned(0.014, 0.014, 0.016, std(0x15130f, 0.5), BX, 0.23, BZ);
    turned(0.0345, 0.0345, 0.06, std(0xe6dcc0, 0.8), BX, 0.045, BZ).castShadow = false;
    const GX = -0.56, GZ = 0.2;
    turned(0.036, 0.031, 0.075, glassy(0xdfeaf0, 0.28), GX, 0, GZ);
    turned(0.031, 0.028, 0.03, glassy(0xc47a1e, 0.85), GX, 0.006, GZ).castShadow = false;
    const ice = span(room, glassy(0xf2fbff, 0.6), GX - 0.014, GX + 0.012, 0.022, 0.046, GZ - 0.012, GZ + 0.014, false);
    ice.rotation.set(0.3, 0.6, 0.2);

    // A sky-blue clamshell handheld, left open on the desk.
    const handheld = new T.Group();
    handheld.position.set(0.62, 0, 0.3);
    handheld.rotation.y = -0.45;
    room.add(handheld);
    const shellBlue = std(0x8fd0f0, 0.35);
    const lcd = std(0x0d1013, 0.25);
    const inner = std(0xd8eef8, 0.5);
    span(handheld, shellBlue, -0.066, 0.066, 0, 0.011, -0.037, 0.037);
    span(handheld, inner, -0.062, 0.062, 0.011, 0.0118, -0.034, 0.034, false);
    span(handheld, lcd, -0.031, 0.031, 0.0118, 0.0124, -0.024, 0.022, false);
    span(handheld, std(0x3a4046, 0.6), -0.054, -0.04, 0.0118, 0.0135, -0.004, 0.002, false);
    span(handheld, std(0x3a4046, 0.6), -0.05, -0.044, 0.0118, 0.0135, -0.008, 0.006, false);
    for (const [x, z] of [[0.047, -0.008], [0.054, -0.001], [0.04, -0.001], [0.047, 0.006]])
        span(handheld, std(0x3a4046, 0.6), x - 0.003, x + 0.003, 0.0118, 0.0135, z - 0.003, z + 0.003, false);
    const lid = new T.Group();
    lid.position.set(0, 0.011, -0.037);
    lid.rotation.x = -1.95;
    handheld.add(lid);
    span(lid, shellBlue, -0.066, 0.066, -0.01, 0, 0, 0.074);
    span(lid, inner, -0.062, 0.062, -0.0108, -0.01, 0.003, 0.071, false);
    span(lid, lcd, -0.031, 0.031, -0.0114, -0.0108, 0.012, 0.06, false);
    Object.assign(parts, { handheld, lid });

    // A black slab phone lying left of the keyboard, screen up and off.
    const phone = new T.Group();
    phone.position.set(-0.32, 0.003, 0.275);
    phone.rotation.y = 0.18;
    room.add(phone);
    const phoneBlack = std(0x0b0c0e, 0.35, 0.4);
    span(phone, phoneBlack, -0.036, 0.036, 0, 0.0075, -0.075, 0.075);
    span(phone, std(0x030405, 0.12), -0.034, 0.034, 0.0075, 0.0079, -0.073, 0.073, false);
    span(phone, phoneBlack, 0.036, 0.0368, 0.003, 0.0055, -0.032, -0.012, false);
    span(phone, phoneBlack, 0.036, 0.0368, 0.003, 0.0055, -0.004, 0.008, false);
    parts.phone = phone;

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
    parts.books = spines.map((color, i) => {
        const w = 0.022 + ((i * 7) % 5) * 0.004;
        const h = 0.15 + ((i * 5) % 4) * 0.018;
        const mesh = span(shelf, std(color, 0.8), bx, bx + w, 0, h, 0.01, 0.13);
        bx += w + 0.002;
        return { x0: bx - w - 0.002, x1: bx - 0.002, h, mesh };
    });
    span(shelf, metal, 0.12, 0.3, 0, 0.07, 0.02, 0.14);
    parts.shelf = shelf;

    // Front wall with the door the visitor comes in through, and a dim
    // light in the hallway behind it that is only on during the entrance.
    const DOOR = { x0: -0.45, x1: 0.45, top: 1.26, z: 3.4 };
    span(room, wall, -2.2, DOOR.x0, -0.74, 1.9, DOOR.z, DOOR.z + 0.1);
    span(room, wall, DOOR.x1, 2.2, -0.74, 1.9, DOOR.z, DOOR.z + 0.1);
    span(room, wall, DOOR.x0, DOOR.x1, DOOR.top, 1.9, DOOR.z, DOOR.z + 0.1);
    span(room, wall, -2.2, 2.2, 1.9, 1.96, WZ - 0.1, DOOR.z + 0.1);
    const hinge = new T.Group();
    hinge.position.set(DOOR.x0, 0, DOOR.z + 0.05);
    span(hinge, darkWood, 0, DOOR.x1 - DOOR.x0, -0.74, DOOR.top, -0.02, 0.02);
    span(hinge, metal, 0.76, 0.84, 0.2, 0.23, -0.06, 0.06, false);
    room.add(hinge);
    parts.door = hinge;
    const hall = new T.PointLight(0xffd9a8, 0, 3.2, 1.6);
    hall.position.set(0.2, 1.3, DOOR.z + 1.3);
    room.add(hall);
    parts.hall = hall;

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

// ---------- things that can be pressed in the look-around view ----------

// A target is a set of meshes with a box around them in `object`'s space.
// The pointer is tested against the box. The outline follows the meshes'
// own silhouette: a mask copy of each mesh sets the target's stencil bit
// where the thing is visible, then slightly larger copies are drawn where
// that bit is clear, so only the rim outside the silhouette shows, hidden by
// whatever is in front. Drawing flips the bit, so no pixel is lit twice.
const maskMaterial = (bit) =>
    new T.MeshBasicMaterial({
        colorWrite: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
        stencilWrite: true, stencilRef: bit, stencilWriteMask: bit, stencilZPass: 7681 /* replace */
    });

function addTarget(id, sources, object, min, max, { thick = 0.007, book = false, quiet = false, bit = 1, fillers = [] } = {}) {
    // Two layers: the line itself and a wider, fainter one around it.
    const [line, halo] = [0, 1].map(() => {
        const made = new T.MeshBasicMaterial({
            transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
            stencilWrite: true, stencilRef: 0, stencilFunc: 514 /* equal */, stencilFuncMask: bit,
            stencilWriteMask: bit, stencilZPass: 5386 /* invert */
        });
        made.color.setRGB(...GLOW);
        return made;
    });
    const materials = [line, halo];
    const extras = [];
    const add = (source, material, order, grow) => {
        const mesh = new T.Mesh(source.geometry, material);
        mesh.renderOrder = order;
        mesh.visible = false;
        mesh.userData.outline = true;
        if (grow) {
            // Grown about the middle of the mesh by the same margin on every side.
            const box = source.geometry.boundingBox;
            for (const axis of ['x', 'y', 'z']) {
                const size = box.max[axis] - box.min[axis];
                mesh.scale[axis] = (size + 2 * grow) / size;
                mesh.position[axis] = ((box.min[axis] + box.max[axis]) / 2) * (1 - mesh.scale[axis]);
            }
        }
        source.add(mesh);
        extras.push(mesh);
    };
    const mask = (source, at) => {
        materials.push(maskMaterial(at));
        add(source, materials[materials.length - 1], 10);
    };
    const t = thick / object.scale.x;
    for (const source of sources) {
        source.geometry.computeBoundingBox();
        const { min: low, max: high } = source.geometry.boundingBox;
        mask(source, bit);
        // Flat things (the screen) are part of the silhouette but have no rim of their own.
        if (Math.min(high.x - low.x, high.y - low.y, high.z - low.z) < 1e-5) continue;
        add(source, line, 11, t);
        add(source, halo, 12, t * 3);
    }
    // Meshes that only cut this group's outlines, each under its own bit.
    for (const [source, at] of fillers) mask(source, at);
    S.targets.push({ id, object, min, max, book, quiet, bit, extras, materials, line, halo, glow: 0, shown: false });
}

function buildTargets(m) {
    for (const target of S.targets) {
        target.extras.forEach((mesh) => mesh.removeFromParent());
        target.materials.forEach((material) => material.dispose());
    }
    S.targets = [];
    const { room, handheld, shelf, books, windowFrame } = S.parts;
    const meshes = (group) => {
        const found = [];
        group.traverse((child) => child.isMesh && !child.userData.outline && found.push(child));
        return found;
    };
    const x0 = -m.gw / 2 - m.bl, x1 = m.gw / 2 + m.br, y0 = -m.gh / 2 - m.bb, y1 = m.gh / 2 + m.bt;
    addTarget('monitor', meshes(S.monitor), S.monitor, [x0, y0 - m.stand, -0.42], [x1, y1, 0.018], { thick: 0.008, bit: 1 });
    addTarget('window', windowFrame, room, [WINDOW.x0 - 0.03, WINDOW.y0 - 0.03, WINDOW.z - 0.1], [WINDOW.x1 + 0.03, WINDOW.y1 + 0.03, WINDOW.z + 0.06], { thick: 0.009, bit: 2 });
    addTarget('console', meshes(handheld), handheld, [-0.075, 0, -0.078], [0.075, 0.085, 0.045], { thick: 0.004, bit: 4 });
    addTarget('books', meshes(shelf), shelf, [-0.35, -0.025, 0], [0.35, 0.215, 0.165], { bit: 8 });
    addTarget('phone', meshes(S.parts.phone), S.parts.phone, [-0.04, 0, -0.079], [0.04, 0.012, 0.079], { thick: 0.003, bit: 16 });
    // The bottle and the glass: not outlined and no hand cursor, for whoever tries.
    addTarget('drink', [], room, [-0.74, 0, 0.02], [-0.52, 0.25, 0.24], { quiet: true });
    // A book can be pressed once the camera is at the shelf, if it has a link.
    // Every book has a stencil bit: a resting book's outline is cut by the
    // whole row, so it is not drawn across its neighbours (see tick).
    let fillers = books.map((b, i) => [b.mesh, 1 << i]).filter((entry, i) => !BOOK_LINKS[i]);
    books.forEach((b, i) => {
        if (!BOOK_LINKS[i]) return;
        addTarget(`book:${i}`, [b.mesh], shelf, [b.x0, 0, 0.01], [b.x1, b.h, 0.132], { thick: 0.0022, book: true, bit: 1 << i, fillers });
        fillers = [];
    });
}

// Distance along a world ray to a target's box, or Infinity.
function hitBox(target, origin, direction) {
    const inverse = S.matrix.copy(target.object.matrixWorld).invert();
    const o = S.rayA.copy(origin).applyMatrix4(inverse);
    const d = S.rayB.copy(origin).add(direction).applyMatrix4(inverse).sub(o);
    let near = -Infinity, far = Infinity;
    for (const [i, axis] of ['x', 'y', 'z'].entries()) {
        if (Math.abs(d[axis]) < 1e-9) {
            if (o[axis] < target.min[i] || o[axis] > target.max[i]) return Infinity;
            continue;
        }
        const a = (target.min[i] - o[axis]) / d[axis], b = (target.max[i] - o[axis]) / d[axis];
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near > far) return Infinity;
    }
    return far < 0 ? Infinity : Math.max(near, 0);
}

// The id of what is under a viewport point: in the room view the nearest
// target, up close only the thing being looked at (or one of its books).
function pick(x, y) {
    const origin = S.camera.position;
    const direction = S.rayD.set((x / S.W) * 2 - 1, 1 - (y / S.H) * 2, 0.5).unproject(S.camera).sub(origin).normalize();
    const focused = S.focusTarget ? S.focusId : null;
    let best = null, bestAt = Infinity;
    const test = (accept) => {
        for (const target of S.targets) {
            if (!accept(target)) continue;
            const at = hitBox(target, origin, direction);
            if (at < bestAt) [best, bestAt] = [target.id, at];
        }
    };
    if (focused === 'books') test((target) => target.book);
    if (!best) test((target) => (focused ? target.id === focused : !target.book));
    return best;
}

function setHover(id) {
    if (S.hover === id) return;
    S.hover = id;
    if (id) root.dataset.roomHover = id.split(':')[0];
    else delete root.dataset.roomHover;
    if (S.panels.label) S.panels.label.textContent = id?.startsWith('book:') ? BOOK_LINKS[+id.slice(5)].title : '';
    if (!S.raf) S.raf = requestAnimationFrame(tick);
}

function setOut(on) {
    if (S.out === on) return;
    S.out = on;
    if (on) root.dataset.roomOut = '';
    else delete root.dataset.roomOut;
}

function openBook(id) {
    const { url } = BOOK_LINKS[+id.slice(5)];
    if (url.startsWith('mailto:')) location.href = url;
    else window.open(url, '_blank', 'noopener');
}

function clearFocus() {
    S.focusT = S.focusTarget = 0;
    S.focusId = null;
    delete root.dataset.roomFocus;
    setHover(null);
    setOut(false);
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
    const lookX = wide ? 0.5 : 0.4, lookY = 0.36;
    // The entrance starts in the hallway, facing the closed door.
    const doorway = new T.Vector3(0, 0.6, 4.3).add(room.position);
    S.poses = {
        entrance: {
            position: doorway,
            target: S.centre.clone(),
            quaternion: new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(doorway, S.centre, new T.Vector3(0, 1, 0)))
        },
        look: pose(lookX, lookY, wide ? 3.5 : 3.2, wide ? 0.06 : 0, 0.06)
    };
    // The look-around starts from the same framing and orbits from there.
    S.orbitHome = { yaw: Math.atan2(lookX, 1), pitch: Math.atan2(lookY, Math.hypot(lookX, 1)), dist: wide ? 3.5 : 3.2 };
    if (!S.lookTarget && !S.lookT) resetOrbit();

    // Close-up poses: far enough back that the thing fills `fill` of the
    // view's height, or most of its width on a narrow screen.
    S.scene.updateMatrixWorld(true);
    buildTargets(m);
    const seenW = W / u / dm, seenH = H / u / dm; // metres in view per metre of distance
    const aimed = (position, target) => ({
        position,
        quaternion: new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(position, target, new T.Vector3(0, 1, 0)))
    });
    const closeUp = (object, centre, from, w, h, fill) => {
        const target = new T.Vector3(...centre).applyMatrix4(object.matrixWorld);
        const distance = Math.max((w * object.scale.x) / seenW / 0.85, (h * object.scale.x) / seenH / fill);
        return aimed(new T.Vector3(...from).transformDirection(object.matrixWorld).multiplyScalar(distance).add(target), target);
    };
    // At the window the visitor stands at the right-hand pane (the curtain
    // covers the other) and looks up over the roofs: the sky fills the view.
    const pane = new T.Vector3((WINDOW.x0 + WINDOW.x1) / 2 + 0.27, WINDOW.y0 + 0.25, WINDOW.z + 0.45).add(room.position);
    S.poses.focus = {
        window: aimed(pane, pane.clone().add(new T.Vector3(0, 0.36, -1))),
        books: closeUp(shelf, [0, 0.09, 0.08], [0, 0.4, 1], 0.7, 0.3, 0.62),
        console: closeUp(S.parts.handheld, [0, 0.03, -0.015], [0, 0.75, 1], 0.15, 0.14, 0.6),
        phone: closeUp(S.parts.phone, [0, 0.008, 0], [0, 1, 0.3], 0.085, 0.16, 0.72),
        drink: closeUp(room, [-0.63, 0.11, 0.13], [0.25, 0.35, 1], 0.3, 0.27, 0.5)
    };

    const ratio = 1 / (S.lean ? PIXEL_LEAN : PIXEL);
    S.renderer.setPixelRatio(ratio);
    S.renderer.setSize(W, H, false);
    S.renderer.shadowMap.needsUpdate = true;
    invalidate();
}

// ---------- camera ----------

function resetOrbit() {
    S.orbit = { ...S.orbitHome };
    S.orbitTarget = { ...S.orbitHome };
}

function orbitBy(yaw, pitch, zoom = 1) {
    const t = S.orbitTarget;
    t.yaw = clamp(t.yaw + yaw, -ORBIT.yaw, ORBIT.yaw);
    t.pitch = clamp(t.pitch + pitch, ORBIT.pitchMin, ORBIT.pitchMax);
    t.dist = clamp(t.dist * zoom, ORBIT.distMin, ORBIT.distMax);
    invalidate();
}

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
            // Look-around: the visitor orbits the monitor; stay inside the walls.
            const o = S.orbit, flat = Math.cos(o.pitch), r = S.parts.room.position;
            camera.position
                .set(Math.sin(o.yaw) * flat, Math.sin(o.pitch), Math.cos(o.yaw) * flat)
                .multiplyScalar(dm * o.dist)
                .add(pose.target);
            camera.position.x = clamp(camera.position.x, r.x - 1.95, r.x + 1.95);
            camera.position.y = clamp(camera.position.y, r.y - 0.6, r.y + 1.75);
            camera.position.z = Math.min(camera.position.z, 3.2);
            camera.quaternion.setFromRotationMatrix(
                S.matrix.lookAt(camera.position, pose.target, camera.up)
            );
            S.poseQuaternion.copy(camera.quaternion);
            if (S.focusT > 0 && S.focusId) {
                // Up close: from wherever the orbit is to the thing's own pose.
                const f = ease(S.focusT), close = S.poses.focus[S.focusId];
                camera.position.lerp(close.position, f);
                S.poseQuaternion.slerp(close.quaternion, f);
            }
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
    carryPanels();
    return k;
}

// The CSS matrix3d that puts an element on a plane in the world. `local`
// maps the element's own pixels to world space; left and top are where its
// layout corner is in the viewport. CSS does the perspective divide.
function cssMatrix(local, left, top) {
    const { camera, W, H } = S;
    const c = local.premultiply(camera.matrixWorldInverse).premultiply(camera.projectionMatrix).elements;
    const out = new Array(16);
    for (let col = 0; col < 4; col++) {
        const x = c[col * 4], y = c[col * 4 + 1], w = c[col * 4 + 3];
        out[col * 4] = 0.5 * W * x + (0.5 * W - left) * w;
        out[col * 4 + 1] = -0.5 * H * y + (0.5 * H - top) * w;
        out[col * 4 + 2] = col === 2 ? 1 : 0;
        out[col * 4 + 3] = w;
    }
    const scale = 1 / out[15];
    return `matrix3d(${out.map((v) => +(v * scale).toFixed(7)).join(',')})`;
}

// DOM that belongs to a close-up: a panel on each screen of the handheld or
// the phone, and the title over the book under the pointer.
function carryPanels() {
    const level = S.focusId ? clamp((ease(S.focusT) - 0.6) / 0.4, 0, 1) * ease(S.lookT) : 0;
    for (const [name, [focus, key, a, b, c, w, h]] of Object.entries(LCD)) {
        const panel = S.panels[name];
        const lcd = S.focusId === focus ? level : 0;
        if (!panel || (!lcd && !S.lcdShown[name])) continue;
        S.lcdShown[name] = lcd > 0;
        if (!lcd) {
            panel.removeAttribute('style');
            continue;
        }
        const world = S.parts[key].matrixWorld;
        const o = S.rayA.set(...a).applyMatrix4(world);
        const x = S.rayB.set(...b).applyMatrix4(world).sub(o).divideScalar(w);
        const y = S.rayD.set(...c).applyMatrix4(world).sub(o).divideScalar(h);
        const matrix = cssMatrix(S.matrix.set(x.x, y.x, 0, o.x, x.y, y.y, 0, o.y, x.z, y.z, 1, o.z, 0, 0, 0, 1), 0, 0);
        panel.style.cssText = `display:block;width:${w}px;height:${h}px;opacity:${lcd.toFixed(3)};transform:${matrix}`;
    }

    const label = S.panels.label;
    const book = level && S.hover?.startsWith('book:') ? S.parts.books[+S.hover.slice(5)] : null;
    if (label && (book || S.labelShown)) {
        if (book) {
            const v = S.rayA.set((book.x0 + book.x1) / 2, book.h, 0.07).applyMatrix4(S.parts.shelf.matrixWorld).project(S.camera);
            label.style.cssText = `display:block;left:${((v.x * 0.5 + 0.5) * S.W).toFixed(1)}px;top:${((0.5 - v.y * 0.5) * S.H).toFixed(1)}px`;
        } else label.removeAttribute('style');
        S.labelShown = !!book;
    }
}

function carryShell(k) {
    const { shell, W, H, u, shellLeft: L, shellTop: Tp } = S;
    if (k >= 1) {
        if (S.carried) {
            shell.style.removeProperty('transform');
            shell.style.removeProperty('transform-origin');
            S.carried = false;
        }
        return;
    }
    // The shell lies on the screen plane, one metre per u pixels.
    shell.style.transformOrigin = '0 0';
    shell.style.transform = cssMatrix(
        S.matrix.set(1 / u, 0, 0, (L - W / 2) / u, 0, -1 / u, 0, (H / 2 - Tp) / u, 0, 0, 1, 0, 0, 0, 0, 1), L, Tp
    );
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
        if (S.lookT === 0) {
            delete root.dataset.roomLook;
            clearFocus();
        }
    }
    if (S.focusT !== S.focusTarget) {
        const step = reduced.matches ? 1 : (dt * 1000) / FOCUS_MS;
        S.focusT = S.focusTarget > S.focusT ? Math.min(1, S.focusT + step) : Math.max(0, S.focusT - step);
        busy = true;
        if (S.focusT === 0) S.focusId = null;
    }
    if (S.lookT > 0)
        for (const axis of ['yaw', 'pitch', 'dist']) {
            const next = reduced.matches ? S.orbitTarget[axis] : approach(S.orbit[axis], S.orbitTarget[axis], dt, 0.09);
            if (next !== S.orbit[axis]) busy = true;
            S.orbit[axis] = next;
        }

    // What the pointer is over, checked when it or the camera has moved.
    if (S.pointer && (S.hoverCheck || busy)) {
        S.hoverCheck = busy;
        const hit = S.lookTarget ? pick(S.pointer.x, S.pointer.y) : null;
        const quiet = (S.focusTarget && !hit?.startsWith('book:')) || S.targets.find((target) => target.id === hit)?.quiet;
        setHover(quiet ? null : hit);
        setOut(!!(S.lookTarget && S.focusTarget && !hit));
    }
    // Outlines: they fade in and out faintly, and stay lit under the pointer.
    const roomLevel = ease(S.lookT) * (1 - ease(S.focusT));
    const bookLevel = S.focusId === 'books' ? ease(S.focusT) * ease(S.lookT) : 0;
    const breath = S.ambient ? 0.225 * (1 - Math.cos(now * 0.0018)) : 0.2;
    for (const target of S.targets) {
        const glow = reduced.matches ? +(S.hover === target.id) : approach(target.glow, S.hover === target.id ? 1 : 0, dt, 0.07);
        if (glow !== target.glow) busy = true;
        target.glow = glow;
        const opacity = (target.book ? bookLevel : roomLevel) * (breath + (1 - breath) * glow);
        target.line.opacity = opacity;
        target.halo.opacity = opacity * (0.25 + 0.2 * glow);
        // Under the pointer a book's outline goes all the way round it.
        if (target.book) target.line.stencilFuncMask = target.halo.stencilFuncMask = glow > 0.3 ? target.bit : 0xff;
        const shown = opacity > 0.01;
        if (shown === target.shown) continue;
        target.shown = shown;
        for (const mesh of target.extras) mesh.visible = shown;
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
    p.chevron.color.setRGB(1.5 * neonLevel + 0.06, 0.25 * neonLevel + 0.02, 1.7 * neonLevel + 0.07);
    p.underscore.color.setRGB(0.2 * neonLevel * blink + 0.02, 1.5 * neonLevel * blink + 0.06, 1.6 * neonLevel * blink + 0.07);
    p.neonGlowA.material.opacity = 0.28 * neonLevel;
    p.neonGlowB.material.opacity = 0.26 * neonLevel * blink;
    p.neonLight.intensity = 0.2 * neonLevel;

    const lamp = S.lamp ? lights : 0;
    p.lampLight.intensity = 0.42 * lamp;
    p.bulb.material.color.setRGB(2 * lamp + 0.08, 1.5 * lamp + 0.07, 0.8 * lamp + 0.05);
    p.bulbGlow.material.opacity = 0.3 * lamp;

    const pulse = fx('pulse') ? 1 + 0.9 * ((S.fx.pulse - now) / 600) : 1;
    S.screenLight.intensity = S.screenBase * 2.2 * power * pulse;
    S.screenSpill.intensity = S.screenBase * 0.16 * power * pulse;
    S.ambientLight.intensity = S.ambientBase * (0.45 + 0.55 * lights);
    S.fill.intensity = S.ambientBase * 1.3 * lights;
    S.materials.power.color.setRGB(0.1, fx('power') ? 4 : 0.5 + 1.2 * power, fx('power') ? 2 : 0.4);
    S.powerHalo.material.opacity = fx('power') ? 1 : 0.2 + 0.4 * power;

    let disk = false;
    p.drives.forEach((drive, i) => {
        const on = fx(`drive${i}`) ? Math.floor(now / 50) % 2 === 0 : false;
        disk ||= on;
        drive.led.material.color.setRGB(on ? 2.4 : 0.1, on ? 4 : 0.7, on ? 2.6 : 0.3);
        drive.halo.material.opacity = on ? 1 : 0.3;
    });
    p.towerLed.material.color.setRGB(disk ? 3 : 0.3, disk ? 1.4 : 0.12, disk ? 0.3 : 0.05);
    const thump = fx('speaker') ? 1 + 0.12 * Math.sin(((S.fx.speaker - now) / 360) * Math.PI) : 1;
    p.cones.forEach((cone) => cone.scale.setScalar(thump));
    if (Object.keys(S.fx).some(fx)) busy = true;

    // Ambient motion: fans turn at the swarm's pace, the neon cursor blinks.
    S.ambient = !S.still && !reduced.matches && visible();
    if (S.ambient) for (const fan of p.fans) fan.rotation.z += fan.userData.direction * S.fanRate * 5 * dt;

    // The door swings in ahead of the camera; the hallway light fades behind it.
    p.door.rotation.y = 1.75 * ease(clamp(S.entrance / 0.14, 0, 1));
    p.hall.intensity = 2.4 * (1 - S.entrance);
    S.materials.screen.color.copy(S.screenColor).multiplyScalar(0.06 + 0.94 * power);

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
    if ((busy || S.ambient) && !S.raf) S.raf = requestAnimationFrame(tick);
}

// ---------- daylight ----------

// The window looks north, so the sun never shines in: what comes through is
// skylight, in the colour and strength the hour gives it. The sky is brighter
// on the sun's side (east is +x, the window faces -z), so the light leans in
// from there and the shadows on the desk swing across during the day.
function applyDaylight(day) {
    if (!S) return;
    S.day = day;
    const p = S.parts;
    const light = p.windowLight;
    const azimuth = (day.sun.azimuth * Math.PI) / 180;
    const height = Math.max(0, Math.sin((day.sun.elevation * Math.PI) / 180));
    const side = 0.5 * Math.sin(azimuth);
    const rise = 0.52 + 0.28 * height;
    const cx = (WINDOW.x0 + WINDOW.x1) / 2, cy = (WINDOW.y0 + WINDOW.y1) / 2;
    light.position.set(cx + side * 2.35, cy + rise * 2.35, WINDOW.z - 2.35);
    light.target.position.set(cx - side * 1.6, cy - rise * 1.6, WINDOW.z + 1.6);
    light.color.setRGB(...day.light);
    light.intensity = day.power;
    S.ambientBase = day.ambient;
    S.ambientLight.color.copy(S.skyBase).lerp(S.skyTint.setRGB(...day.light), 0.35);
    p.city.paint(day);
    root.style.setProperty('--room-sky', `linear-gradient(${day.top}, ${day.low} 62%)`);
    S.renderer.shadowMap.needsUpdate = true;
    invalidate();
}

// ---------- lifecycle ----------

function build(canvas, gl) {
    const renderer = new T.WebGLRenderer({ canvas, context: gl, antialias: false, stencil: true });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;

    const scene = new T.Scene();
    scene.background = new T.Color(0x020306);
    const camera = new T.PerspectiveCamera();
    const parts = buildRoom(scene);
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
        ambientBase: 1, screenBase: 0.5, skyTint: new T.Color(), skyBase: new T.Color(0x7f93bd),
        entrance: 1, lookT: 0, lookTarget: 0, px: 0, py: 0,
        focusId: null, focusT: 0, focusTarget: 0, hover: null, out: false, pointer: null, hoverCheck: false,
        targets: [], lcdShown: {},
        panels: {
            top: document.getElementById('focus-console-top'),
            bottom: document.getElementById('focus-console-bottom'),
            phone: document.getElementById('focus-phone'),
            label: document.getElementById('focus-book-label')
        },
        back: document.getElementById('focus-back'),
        rayA: new T.Vector3(), rayB: new T.Vector3(), rayD: new T.Vector3(),
        power: 1, powerTarget: 1, lights: 1, lightsTarget: 1, lamp: false,
        screenColor: new T.Color(0x050607), fanRate: 0.25, fx: {}, frame: 0, last: 0, raf: 0, dirty: true, still: false, ambient: false, carried: false,
        tmp: new T.Vector3(), target: new T.Vector3(), matrix: new T.Matrix4(),
        identity: new T.Quaternion(), poseQuaternion: new T.Quaternion(),
        events: new AbortController()
    };
    const signal = S.events.signal;
    readTheme();
    applyDaylight(currentDaylight());
    S.offDaylight = onDaylight(applyDaylight);
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
        parts.city.drift(S.day.lit);
        invalidate();
    }, 9000);

    // Pressing the room (anything outside the monitor) steps back to look at
    // it. There a drag orbits and the wheel or a pinch zooms. Pressing the
    // monitor returns; the handheld, the books and the window come up close,
    // and from there a press beside them or Escape steps back out.
    S.back?.addEventListener('click', () => room3d.focus(null), { signal });
    const pointers = new Map();
    let drag = null;
    const spread = () => {
        const [a, b] = [...pointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y) || 1;
    };
    const capture = { signal, capture: true };
    window.addEventListener('pointerdown', (event) => {
        let opening = false;
        if (event.target.closest?.('#room-focus')) return;
        if (!S.lookTarget) {
            if (event.target !== document.body && event.target !== root) return;
            if (!desktop.matches || event.button !== 0 || !room3d.look(true, { x: event.clientX, y: event.clientY })) return;
            opening = true;
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1) drag = { moved: 0, opening };
        else if (drag) drag.moved = Infinity;
    }, capture);
    window.addEventListener('pointermove', (event) => {
        const point = pointers.get(event.pointerId);
        if (!pointers.size && event.pointerType === 'mouse') {
            S.pointer = { x: event.clientX, y: event.clientY };
            if (S.lookTarget) {
                S.hoverCheck = true;
                if (!S.raf) S.raf = requestAnimationFrame(tick);
            }
        }
        if (!point || !S.lookTarget || !drag) return;
        const before = pointers.size === 2 ? spread() : 0;
        const dx = event.clientX - point.x, dy = event.clientY - point.y;
        point.x = event.clientX;
        point.y = event.clientY;
        if (pointers.size === 2) return S.focusTarget ? undefined : orbitBy(0, 0, before / spread());
        drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.moved < 5 || S.focusTarget) return;
        setHover(null);
        root.dataset.roomLook = 'drag';
        orbitBy(-dx * 0.006, dy * 0.005);
    }, capture);
    const release = (event) => {
        if (!pointers.delete(event.pointerId) || pointers.size) return;
        const pressed = drag && drag.moved < 5 && !drag.opening && event.type === 'pointerup';
        drag = null;
        if ('roomLook' in root.dataset) root.dataset.roomLook = '';
        if (!pressed || !S.lookTarget) return;
        const hit = pick(event.clientX, event.clientY);
        if (S.focusTarget) {
            if (hit?.startsWith('book:')) openBook(hit);
            else if (!hit) room3d.focus(null);
        } else if (hit === 'monitor') endLook();
        else if (hit) room3d.focus(hit);
    };
    window.addEventListener('pointerup', release, capture);
    window.addEventListener('pointercancel', release, capture);
    window.addEventListener('blur', () => {
        pointers.clear();
        drag = null;
    }, { signal });
    window.addEventListener('wheel', (event) => {
        if (!S.lookTarget) return;
        event.preventDefault();
        if (S.focusTarget) return;
        orbitBy(0, 0, Math.exp(clamp(event.deltaY, -120, 120) * 0.0015));
    }, { signal, capture: true, passive: false });
    const KEYS = {
        ArrowLeft: [0.14, 0, 1], ArrowRight: [-0.14, 0, 1], ArrowUp: [0, 0.1, 1], ArrowDown: [0, -0.1, 1],
        '+': [0, 0, 0.88], '=': [0, 0, 0.88], '-': [0, 0, 1.14]
    };
    window.addEventListener('keydown', (event) => {
        if (!S.lookTarget) return;
        const move = event.key === 'Escape' ? [] : !S.focusTarget && KEYS[event.key];
        if (!move) return;
        event.preventDefault();
        event.stopPropagation();
        // Escape steps back one level: close-up, room, reading.
        if (move.length) orbitBy(...move);
        else if (S.focusTarget) room3d.focus(null);
        else endLook();
    }, capture);
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
    S.screenColor.set(light ? 0xd9ddd6 : 0x050607);
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
                    antialias: false,
                    alpha: true,
                    // The outlines of the things that can be pressed are cut with it.
                    stencil: true,
                    powerPreference: 'high-performance',
                    failIfMajorPerformanceCaveat: !force
                });
                if (!gl) throw new Error('webgl2 unavailable');
                // A software rasteriser cannot hold the frame rate; some browsers
                // do not report it as a performance caveat.
                const info = gl.getExtension('WEBGL_debug_renderer_info');
                const name = (gpuName = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '');
                if (!force && /swiftshader|llvmpipe|software/i.test(name)) throw new Error('software renderer');
                T = await import(VENDOR);
                if (dead) return false;
                build(canvas, gl);
                root.dataset.room3d = 'on';
                room3d.ready = true;
                if (new URLSearchParams(location.search).get('debug') === '1') window.roomDebug = room3d;
                return true;
            } catch (error) {
                console.warn('3D room unavailable:', error.message);
                fail(error.message);
                return false;
            }
        })();
        return initPromise;
    },

    // Where the window's sky is on screen (CSS px), or null when the room is
    // not showing one. The swarm draws itself there, behind this canvas.
    skyRect() {
        if (!S || !desktop.matches || !visible()) return null;
        const origin = S.parts.room.position;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [x, y] of [[WINDOW.x0, WINDOW.y0], [WINDOW.x1, WINDOW.y0], [WINDOW.x0, WINDOW.y1], [WINDOW.x1, WINDOW.y1]]) {
            const v = S.tmp.set(x, y, WINDOW.z).add(origin).project(S.camera);
            const px = (v.x * 0.5 + 0.5) * S.W, py = (0.5 - v.y * 0.5) * S.H;
            x0 = Math.min(x0, px); x1 = Math.max(x1, px);
            y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        // At the reading position the monitor hides the window's right side.
        if (S.entrance >= 1 && !S.lookT && S.shellLeft - x0 > 60) x1 = Math.min(x1, S.shellLeft);
        x0 = clamp(x0, 0, S.W); x1 = clamp(x1, 0, S.W);
        y0 = clamp(y0, 0, S.H); y1 = clamp(y1, 0, S.H);
        return { left: x0, top: y0, width: Math.max(x1 - x0, 40), height: Math.max(y1 - y0, 40) };
    },

    // Rendered pixels per CSS pixel.
    pixelRatio() {
        return 1 / (S?.lean ? PIXEL_LEAN : PIXEL);
    },

    // Entrance progress: 0 is the wide shot, 1 is the reading position.
    setCamera(progress) {
        if (!S) return;
        S.entrance = clamp(progress, 0, 1);
        if (S.entrance < 1 && S.lookTarget) {
            S.lookT = S.lookTarget = 0;
            delete root.dataset.roomLook;
            clearFocus();
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

    // Step back to see the whole room and orbit it; pressing the monitor or
    // Escape returns.
    // at: where the visitor pressed; the camera steps back toward the side
    // that shows that part of the room.
    look(on = !S?.lookTarget, at = null) {
        if (!S || S.entrance < 1) return false;
        if (on && document.body.dataset.displayMode !== 'flat') return false;
        S.lookTarget = on ? 1 : 0;
        if (on) {
            if (!S.lookT) {
                resetOrbit();
                if (at) {
                    const nx = (at.x / S.W) * 2 - 1, ny = (at.y / S.H) * 2 - 1;
                    const yaw = clamp(-nx * 0.95, -ORBIT.yaw, ORBIT.yaw);
                    const pitch = clamp(S.orbitHome.pitch + ny * 0.42, ORBIT.pitchMin, ORBIT.pitchMax);
                    Object.assign(S.orbit, { yaw, pitch });
                    Object.assign(S.orbitTarget, { yaw, pitch });
                }
            }
            root.dataset.roomLook = '';
        } else {
            S.focusTarget = 0;
            delete root.dataset.roomFocus;
            setHover(null);
            setOut(false);
        }
        invalidate();
        return true;
    },

    get looking() {
        return !!S?.lookTarget;
    },

    // From the room view, bring the camera up close to 'console', 'phone',
    // 'books' or 'window'; null steps back to the room view.
    focus(id) {
        if (!S?.lookTarget || (id && !S.poses.focus[id])) return false;
        if (id) {
            S.focusId = id;
            S.focusTarget = 1;
            root.dataset.roomFocus = id;
        } else {
            S.focusTarget = 0;
            delete root.dataset.roomFocus;
        }
        setHover(null);
        setOut(false);
        invalidate();
        return true;
    },

    get focused() {
        return S?.focusTarget ? S.focusId : null;
    },

    // Where the front of a pressable thing is on screen (CSS px), for tests.
    spot(id) {
        const target = S?.targets.find((entry) => entry.id === id);
        if (!target) return null;
        const { min, max } = target;
        const v = S.rayA.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, max[2]).applyMatrix4(target.object.matrixWorld).project(S.camera);
        return { x: (v.x * 0.5 + 0.5) * S.W, y: (0.5 - v.y * 0.5) * S.H };
    },

    // Frames ran slow: stop ambient motion.
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
        fail('slow frames');
        return true;
    },

    // One rung down the performance ladder; false when nothing is left to give.
    // The room is only given up when frames are severely slow: a slightly
    // choppy 3D room is still better than none.
    step(severe = true) {
        if (!S) return false;
        if (room3d.still()) return true;
        // Second rung: coarser pixels before giving the room up.
        if (!S.lean) return (S.lean = true), layout(), true;
        return severe ? room3d.abandon() : true;
    },

    // One line for the `perf` command.
    status() {
        let off = null;
        try {
            off = sessionStorage.getItem(OFF_KEY);
        } catch {}
        const state = S ? (S.lean ? 'on, coarse pixels, ambient motion off' : S.still ? 'on, ambient motion off' : 'on') : `off (${off || 'not started'})`;
        return `3D room: ${state}\nGPU: ${gpuName || 'unknown'}`;
    },

    // Forget that 3D was dropped in this tab and start over.
    retry() {
        try {
            sessionStorage.removeItem(OFF_KEY);
        } catch {}
        location.reload();
    },

    destroy() {
        dead = true;
        room3d.ready = false;
        delete root.dataset.room3d;
        delete root.dataset.roomLook;
        delete root.dataset.roomFocus;
        delete root.dataset.roomHover;
        delete root.dataset.roomOut;
        if (!S) return;
        for (const panel of Object.values(S.panels)) panel?.removeAttribute('style');
        cancelAnimationFrame(S.raf);
        clearInterval(S.cityTimer);
        S.offDaylight();
        S.events.abort();
        S.shell.style.removeProperty('transform');
        S.shell.style.removeProperty('transform-origin');
        S.renderer.dispose();
        S = null;
    }
};
