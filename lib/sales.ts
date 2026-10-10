export type SalesSummary = {
  day: string;
  value: number;
  confirmed: number;
  pending: number;
  average: number;
};

// Boundaries use the restaurant's Brazilian business day, not the browser's timezone.
export function salesDay(now = new Date(), zone = "America/Sao_Paulo") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const parts = (date: Date) => Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  const local = parts(now);
  const midnight = (dayOffset: number) => {
    const wall = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day) + dayOffset);
    let instant = wall;
    for (let i = 0; i < 3; i++) {
      const p = parts(new Date(instant));
      const offset = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - instant;
      instant = wall - offset;
    }
    return new Date(instant).toISOString();
  };
  return { day: `${local.year}-${local.month}-${local.day}`, start: midnight(0), end: midnight(1) };
}

export function salesSummary(day: string, value: number, confirmed: number, pending: number): SalesSummary {
  return { day, value, confirmed, pending, average: confirmed ? Math.round(value / confirmed) : 0 };
}
