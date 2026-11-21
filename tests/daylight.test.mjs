// Run with: node --test tests/daylight.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { sunAt, sunEvents, daylightAt, phaseTime, kstClock, kstToday, PHASES } from '../js/modules/daylight.js';

const kst = (text) => Date.parse(`${text}+09:00`);
const minutes = (clock) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));

// Published sunrise and sunset for Suwon / Seoul area (KST).
const ALMANAC = [
    ['2026-03-20', '06:36', '18:43'],
    ['2026-06-21', '05:11', '19:56'],
    ['2026-09-23', '06:20', '18:28'],
    ['2026-12-22', '07:43', '17:18']
];

test('sunrise and sunset match the almanac within three minutes', () => {
    for (const [date, rise, set] of ALMANAC) {
        const events = sunEvents(kst(`${date}T12:00:00`));
        assert.ok(Math.abs(minutes(kstClock(events.sunrise)) - minutes(rise)) <= 3, `${date} sunrise ${kstClock(events.sunrise)}`);
        assert.ok(Math.abs(minutes(kstClock(events.sunset)) - minutes(set)) <= 3, `${date} sunset ${kstClock(events.sunset)}`);
    }
});

test('the sun is in the east before noon, south at noon and west after', () => {
    const events = sunEvents(kst('2026-11-21T12:00:00'));
    assert.ok(sunAt(events.noon - 3 * 3600000).azimuth < 180);
    assert.ok(Math.abs(sunAt(events.noon).azimuth - 180) < 1);
    assert.ok(sunAt(events.noon + 3 * 3600000).azimuth > 180);
    assert.ok(Math.abs(sunAt(events.sunrise).elevation + 0.833) < 0.1);
    assert.ok(sunAt(events.noon - 12 * 3600000).elevation < -18);
});

test('the turning points come in order', () => {
    for (const [date] of ALMANAC) {
        const e = sunEvents(kst(`${date}T12:00:00`));
        const order = [e.start, e.firstLight, e.dawn, e.sunrise, e.morning, e.noon, e.afternoon, e.sunset, e.dusk, e.lastLight, e.start + 86400000];
        for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], `${date} step ${i}`);
    }
});

test('each mood is reached at its own moment', () => {
    const now = kst('2026-11-21T12:00:00');
    for (const name of PHASES) assert.equal(daylightAt(phaseTime(name, now)).phase, name);
});

test('nothing jumps from one minute to the next, midnight included', () => {
    const channels = (state) => [
        ...[state.top, state.low, state.tower].flatMap((colour) => colour.match(/\d+/g).map((n) => n / 255)),
        ...state.light,
        state.power / 10,
        state.ambient,
        state.lit
    ];
    const start = kst('2026-11-21T00:00:00') - 3600000;
    let before = channels(daylightAt(start));
    for (let minute = 1; minute <= 26 * 60; minute++) {
        const now = channels(daylightAt(start + minute * 60000));
        now.forEach((value, i) => assert.ok(Math.abs(value - before[i]) < 0.03, `minute ${minute} channel ${i}`));
        before = now;
    }
});

test('the hour of the visitor does not matter', () => {
    assert.equal(kstClock(kst('2026-11-21T18:30:00')), '18:30');
    assert.equal(kstToday(18, 30, kst('2026-11-21T03:00:00')), kst('2026-11-21T18:30:00'));
    const night = daylightAt(kst('2026-11-21T23:00:00'));
    const noon = daylightAt(kst('2026-11-21T12:30:00'));
    assert.ok(night.lit > 0.4 && noon.lit < 0.1);
    assert.ok(noon.ambient > night.ambient);
});
