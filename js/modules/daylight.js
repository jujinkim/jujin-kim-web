// The sky outside the room's window follows the real sun over Suwon, where the
// owner lives, whatever the visitor's own clock says. Seven moods (night, dawn,
// sunrise, day, afternoon, sunset, evening) are tied to where the sun is today
// and blended, so nothing changes at a fixed hour.

const LAT = 37.2636;
const LON = 127.0286;
const KST = 9 * 3600000;
const DAY = 86400000;
const MIN = 60000;
const RAD = Math.PI / 180;

export const PHASES = ['night', 'dawn', 'sunrise', 'day', 'afternoon', 'sunset', 'evening'];

// top/low: the sky's gradient. tower: the unlit city. light: the colour of what
// comes in through the window (linear RGB, the rest are screen colours), power: how strong it is, ambient:
// the room's base brightness. The window looks north, so this is skylight only.
const MOODS = {
    night: { top: '#04060f', low: '#1b1d3a', tower: '#070a13', light: [0.42, 0.52, 1.0], power: 5, ambient: 0.9 },
    dawn: { top: '#0c1430', low: '#3a4672', tower: '#0a0e1a', light: [0.5, 0.62, 1.0], power: 5, ambient: 0.9 },
    sunrise: { top: '#2b417c', low: '#dc9c86', tower: '#16131f', light: [1.0, 0.74, 0.6], power: 7, ambient: 1.05 },
    day: { top: '#3c6cab', low: '#b4cde4', tower: '#2a3542', light: [0.86, 0.92, 1.0], power: 9, ambient: 1.3 },
    afternoon: { top: '#3f66a0', low: '#cfc9c0', tower: '#2c323b', light: [0.98, 0.9, 0.8], power: 8.5, ambient: 1.25 },
    sunset: { top: '#1b2148', low: '#d0683e', tower: '#120f1c', light: [1.0, 0.58, 0.34], power: 7, ambient: 1.05 },
    evening: { top: '#0b1030', low: '#4b3662', tower: '#0b0b16', light: [0.6, 0.55, 0.95], power: 5.5, ambient: 0.95 }
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const css = (rgb) => `rgb(${rgb.map((c) => Math.round(c)).join(', ')})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

for (const mood of Object.values(MOODS)) for (const key of ['top', 'low', 'tower']) mood[key] = parse(mood[key]);

// NOAA solar position. Declination in radians, equation of time in minutes.
function solar(ms) {
    const T = (ms / DAY + 2440587.5 - 2451545) / 36525;
    const L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) * RAD;
    const M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD;
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C =
        Math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
        Math.sin(2 * M) * (0.019993 - 0.000101 * T) +
        Math.sin(3 * M) * 0.000289;
    const omega = (125.04 - 1934.136 * T) * RAD;
    const lambda = L0 + (C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
    const eps = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega)) * RAD;
    const y = Math.tan(eps / 2) ** 2;
    const eot =
        (4 / RAD) *
        (y * Math.sin(2 * L0) -
            2 * e * Math.sin(M) +
            4 * e * y * Math.sin(M) * Math.cos(2 * L0) -
            0.5 * y * y * Math.sin(4 * L0) -
            1.25 * e * e * Math.sin(2 * M));
    return { decl: Math.asin(Math.sin(eps) * Math.sin(lambda)), eot };
}

// Where the sun is over Suwon, in degrees. Azimuth runs clockwise from north.
export function sunAt(ms) {
    const { decl, eot } = solar(ms);
    const minutes = (((ms % DAY) + DAY) % DAY) / MIN;
    const ha = ((((minutes + eot + 4 * LON) % 1440) + 1440) % 1440 / 4 - 180) * RAD;
    const lat = LAT * RAD;
    const elevation = Math.asin(clamp(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha), -1, 1));
    const azimuth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;
    return { azimuth: ((azimuth / RAD) % 360 + 360) % 360, elevation: elevation / RAD };
}

const dayStart = (ms) => Math.floor((ms + KST) / DAY) * DAY - KST;

// When the sun crosses a given elevation on the Korean day that starts at
// `start`: side -1 in the morning, +1 in the evening, 0 for solar noon.
function crossing(start, degrees, side) {
    let at = start + 12.5 * 3600000;
    for (let pass = 0; pass < 3; pass++) {
        const { decl, eot } = solar(at);
        const noon = start + KST + (720 - 4 * LON - eot) * MIN;
        if (!side) return noon;
        const lat = LAT * RAD;
        const cos = (Math.sin(degrees * RAD) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
        at = noon + side * (Math.acos(clamp(cos, -1, 1)) / RAD) * 4 * MIN;
    }
    return at;
}

const eventCache = new Map();

// The day's turning points in Suwon, as timestamps.
export function sunEvents(ms) {
    const start = dayStart(ms);
    let events = eventCache.get(start);
    if (!events) {
        events = {
            start,
            firstLight: crossing(start, -18, -1),
            dawn: crossing(start, -6, -1),
            sunrise: crossing(start, -0.833, -1),
            morning: crossing(start, 12, -1),
            noon: crossing(start, 0, 0),
            afternoon: crossing(start, 12, 1),
            sunset: crossing(start, -0.833, 1),
            dusk: crossing(start, -6, 1),
            lastLight: crossing(start, -18, 1)
        };
        if (eventCache.size > 8) eventCache.clear();
        eventCache.set(start, events);
    }
    return events;
}

// The moods in the order the day passes through them. Night holds from last
// light to first light and day from mid-morning to solar noon.
function anchors(events) {
    return [
        [events.start, 'night'],
        [events.firstLight, 'night'],
        [events.dawn, 'dawn'],
        [events.sunrise, 'sunrise'],
        [events.morning, 'day'],
        [events.noon, 'day'],
        [events.afternoon, 'afternoon'],
        [events.sunset, 'sunset'],
        [events.dusk, 'evening'],
        [events.lastLight, 'night'],
        [events.start + DAY, 'night']
    ];
}

// How awake the city is by the Korean clock, 0..1.
const AWAKE = [[0, 0.7], [2, 0.35], [4.5, 0.2], [6.5, 0.5], [8, 0.4], [17, 0.6], [20, 1], [23, 0.9], [24, 0.7]];

function awake(hour) {
    for (let i = 1; i < AWAKE.length; i++) {
        const [h0, v0] = AWAKE[i - 1];
        const [h1, v1] = AWAKE[i];
        if (hour <= h1) return v0 + ((v1 - v0) * (hour - h0)) / (h1 - h0);
    }
    return AWAKE[0][1];
}

export function daylightAt(ms) {
    const events = sunEvents(ms);
    const list = anchors(events);
    let i = 1;
    while (i < list.length - 1 && ms >= list[i][0]) i++;
    const [t0, from] = list[i - 1];
    const [t1, to] = list[i];
    const t = t1 > t0 ? clamp((ms - t0) / (t1 - t0), 0, 1) : 0;
    const a = MOODS[from];
    const b = MOODS[to];
    const sun = sunAt(ms);
    const dark = clamp((6 - sun.elevation) / 12, 0, 1);
    const hour = (ms - events.start) / 3600000;
    return {
        ms,
        phase: t < 0.5 ? from : to,
        top: css(mix(a.top, b.top, t)),
        low: css(mix(a.low, b.low, t)),
        tower: css(mix(a.tower, b.tower, t)),
        light: mix(a.light, b.light, t),
        power: a.power + (b.power - a.power) * t,
        ambient: a.ambient + (b.ambient - a.ambient) * t,
        // 0 in daylight, 1 once it is dark.
        dark,
        // Share of the city's windows that are lit.
        lit: 0.08 + dark * (0.12 + 0.4 * awake(hour)),
        sun
    };
}

// A moment today when a mood is at its fullest.
export function phaseTime(name, ms) {
    const events = sunEvents(ms);
    return {
        night: events.noon - DAY / 2,
        dawn: events.dawn,
        sunrise: events.sunrise,
        day: events.noon,
        afternoon: events.afternoon,
        sunset: events.sunset,
        evening: events.dusk
    }[name];
}

// "HH:MM" in Korea for a timestamp.
export function kstClock(ms) {
    const minutes = Math.floor((((ms + KST) % DAY) + DAY) % DAY / MIN);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// A Korean clock time today as a timestamp.
export const kstToday = (hours, minutes, ms = Date.now()) => dayStart(ms) + hours * 3600000 + minutes * MIN;

// ---------- the clock ----------

const listeners = new Set();
let override = null;
let timer = 0;
let watching = false;

export const skyNow = () => override ?? Date.now();
export const currentDaylight = () => daylightAt(skyNow());

function fire() {
    const state = currentDaylight();
    for (const listener of listeners) listener(state);
}

function schedule() {
    clearTimeout(timer);
    timer = 0;
    if (!listeners.size || document.hidden) return;
    timer = setTimeout(() => {
        fire();
        schedule();
    }, MIN - (Date.now() % MIN) + 50);
}

// Calls back once a minute while the page is visible, and when it returns.
export function onDaylight(listener) {
    listeners.add(listener);
    if (!watching) {
        watching = true;
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) fire();
            schedule();
        });
    }
    schedule();
    return () => listeners.delete(listener);
}

// Holds the sky at one moment (null: back to the real time).
export function setSkyTime(ms) {
    override = ms ?? null;
    fire();
    return currentDaylight();
}
