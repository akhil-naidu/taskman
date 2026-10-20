export const FIXTURE_NOW = Date.parse("2026-10-20T06:30:00.000Z");

export function startOfIstDay(ms: number): number {
  return Date.parse(`${istDateString(ms)}T00:00:00+05:30`);
}

let cachedDay = "";
let cachedStamp = 0;

export function currentIstDay(): number {
  const day = istDateString(Date.now());
  if (day !== cachedDay) {
    cachedDay = day;
    cachedStamp = startOfIstDay(Date.now());
  }
  return cachedStamp;
}

export function istDateString(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function formatIst(ms: number): string {
  if (!ms) return "unknown";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ms));
  return `${formatted} IST`;
}
