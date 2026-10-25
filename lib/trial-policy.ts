/** Um mês grátis: 30 dias corridos a partir da primeira pizzaria. */
export const TRIAL_DAYS = 30;
export const TRIAL_SECONDS = TRIAL_DAYS * 86400;
export type Trial = { status:"active"|"expired"|"not_started"; endsAt: number; daysRemaining: number };
export function trialFromStart(startedAt: string | number | null | undefined, now = Math.floor(Date.now()/1000)): Trial {
  const started = typeof startedAt === "string" ? Date.parse(startedAt)/1000 : startedAt;
  if (typeof started !== "number" || !Number.isFinite(started) || started < 0 || started > now) {
    return {status:"not_started",endsAt:0,daysRemaining:0};
  }
  const endsAt = Math.floor(started) + TRIAL_SECONDS;
  return {status:endsAt > now ? "active" : "expired",endsAt,daysRemaining:Math.max(0,Math.ceil((endsAt-now)/86400))};
}
