const formats = new Map();
function formatterFor(locale, options) {
  const key = locale + JSON.stringify(options);
  if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat(locale, options));
  return formats.get(key);
}
export const HOUR = 3600000;
export const EASTERN = 'America/New_York';
export const regions = [
  { name: 'Eastern', zone: EASTERN, lat: 40.7128, lon: -74.006 },
  { name: 'Central', zone: 'America/Chicago', lat: 41.8781, lon: -87.6298 },
  { name: 'Mountain', zone: 'America/Denver', lat: 39.7392, lon: -104.9903 },
  { name: 'Pacific', zone: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 }
];
export function dateKey(date, zone = EASTERN) {
  const parts = formatterFor('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(key, days) {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function zonedTime(key, hour = 0, zone = EASTERN) {
  const [y, m, d] = key.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d, hour);
  let guess = target;
  const formatter = formatterFor('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 4; i++) {
    const p = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(v => [v.type, v.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const correction = target - shown;
    guess += correction;
    if (Math.abs(correction) < 1000) break;
  }
  return guess;
}
// Same geometric solar model as the pinned SunCalc 1.9 position calculation.
// The earth-fixed unit vector also feeds the fragment shader directly.
export function sunVector(date) {
  const rad = Math.PI / 180;
  const d = date.valueOf() / 86400000 + 2440587.5 - 2451545;
  const m = rad * (357.5291 + .98560028 * d);
  const c = rad * (1.9148 * Math.sin(m) + .02 * Math.sin(2 * m) + .0003 * Math.sin(3 * m));
  const l = m + c + rad * 102.9372 + Math.PI;
  const e = rad * 23.4397;
  const dec = Math.asin(Math.sin(l) * Math.sin(e));
  const ra = Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l));
  const lon = ra - rad * (280.16 + 360.9856235 * d);
  return [Math.cos(dec) * Math.cos(lon), Math.sin(dec), Math.cos(dec) * Math.sin(lon)];
}
export function altitude(date, lat, lon) {
  const r = Math.PI / 180, s = sunVector(date);
  return Math.asin(Math.cos(lat*r)*Math.cos(lon*r)*s[0] + Math.sin(lat*r)*s[1] + Math.cos(lat*r)*Math.sin(lon*r)*s[2]) / r;
}
export function clockParts(date, zone) {
  const p = formatterFor('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).formatToParts(date);
  const get = t => p.find(v => v.type === t)?.value;
  return { time: `${get('hour')}:${get('minute')}`, abbreviation: get('timeZoneName') };
}
