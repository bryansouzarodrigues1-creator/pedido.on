/**
 * Regras puras do futuro gateway Asaas.
 * Este arquivo não realiza cobranças, não lê segredos e não habilita pagamentos.
 * Integração ativável somente após migrações, webhooks e testes de homologação.
 */
export type AsaasMode = "sandbox" | "production";
export type AsaasPlan = "essencial" | "profissional" | "rede";
export type AsaasConfigInput = {
  PEDIDO_BILLING_ENABLED?: string;
  PEDIDO_BILLING_PROVIDER?: string;
  ASAAS_ENV?: string;
  ASAAS_API_KEY?: string;
  ASAAS_WEBHOOK_TOKEN?: string;
  PEDIDO_BILLING_SANDBOX_ONLY?: string;
  PEDIDO_BILLING_SANDBOX_TEST_OWNERS?: string;
};
export type AsaasPayment = {
  id: string;
  customer: string;
  subscription: string;
  status: string;
  value: number;
  dueDate: string;
};
export type AsaasEntitlement = {paidThrough: number; paidPlan: AsaasPlan | ""};

export const ASAAS_PLAN_CENTS: Record<AsaasPlan, number> = {
  essencial: 4900, profissional: 8900, rede: 14900,
};

export function readAsaasConfig(input: AsaasConfigInput) {
  const mode = input.ASAAS_ENV;
  const sandbox = mode === "sandbox";
  const production = mode === "production";
  const key = input.ASAAS_API_KEY || "";
  const token = input.ASAAS_WEBHOOK_TOKEN || "";
  const keyMatchesEnvironment = sandbox ? key.startsWith("$aact_hmlg_") : production && key.startsWith("$aact_prod_");
  const webhookValid = token.length >= 32 && token.length <= 255 && !/\s/.test(token);
  const sandboxOnly = input.PEDIDO_BILLING_SANDBOX_ONLY === "true";
  return {
    enabled: input.PEDIDO_BILLING_ENABLED === "true"
      && input.PEDIDO_BILLING_PROVIDER === "asaas"
      && (sandbox || production)
      && (!sandboxOnly || sandbox)
      && keyMatchesEnvironment && webhookValid && token !== key && !/\s/.test(key),
    sandboxOnly,
    mode: sandbox ? "sandbox" as const : production ? "production" as const : null,
    baseUrl: sandbox ? "https://api-sandbox.asaas.com/v3" : production ? "https://api.asaas.com/v3" : null,
  };
}

/** Only explicitly named QA accounts can exercise paid access with fictitious money. */
export function sandboxBillingOwner(input: AsaasConfigInput, ownerId?: string): boolean {
  return !!ownerId && input.PEDIDO_BILLING_SANDBOX_ONLY === "true"
    && input.ASAAS_ENV === "sandbox"
    && (input.PEDIDO_BILLING_SANDBOX_TEST_OWNERS || "").split(",").map(v => v.trim()).includes(ownerId);
}

/** URL de fatura devolvida pelo Asaas: recuse domínios externos e credenciais na URL. */
export function safeAsaasInvoiceUrl(value: unknown, mode: AsaasMode): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const hosts = mode === "sandbox" ? ["sandbox.asaas.com"] : ["www.asaas.com", "asaas.com"];
    const parts = url.pathname.split("/").filter(Boolean);
    // A URL pública do Asaas pode ter um novo prefixo (ex.: /000/i/ID).
    // Verifique o host e os segmentos, sem extrair IDs por posição fixa.
    const invoiceAt = parts.length === 2 ? 0 : parts.length === 3 ? 1 : -1;
    if (url.protocol !== "https:" || !hosts.includes(url.hostname)
      || url.port || url.username || url.password || invoiceAt < 0
      || (invoiceAt === 1 && !/^[a-zA-Z0-9_-]{1,32}$/.test(parts[0]))
      || parts[invoiceAt] !== "i" || !/^[a-zA-Z0-9_-]{3,200}$/.test(parts[invoiceAt + 1])) return null;
    return url.href;
  } catch { return null; }
}

/** Comparação resistente a diferença de tempo de autenticação do webhook. */
export async function validAsaasWebhookToken(received: string | null, expected: string): Promise<boolean> {
  if (!received || expected.length < 32 || expected.length > 255) return false;
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([hash(received), hash(expected)]);
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

/** Data civil em UTC, independentemente de fuso e horário de verão. */
export function monthAfterDueDate(dueDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const [year, month, day] = dueDate.split("-").map(Number);
  const actual = new Date(Date.UTC(year, month - 1, day));
  if (actual.getUTCFullYear() !== year || actual.getUTCMonth() !== month - 1
    || actual.getUTCDate() !== day || year < 2020 || year > 2100) return null;
  const endOfNextMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = Date.UTC(year, month, Math.min(day, endOfNextMonth));
  return Math.floor(end / 1000);
}

/**
 * Acesso vem exclusivamente de cobranças confirmadas pelo provedor.
 * Recalcular a partir das faturas atuais evita que um evento antigo de estorno
 * derrube uma mensalidade mais recente já paga.
 */
export function asaasEntitlement(
  payments: readonly AsaasPayment[],
  subscriptionId: string,
  customerId: string,
  plan: AsaasPlan,
): AsaasEntitlement {
  let paidThrough = 0;
  const seen = new Set<string>();
  for (const payment of payments) {
    if (!payment.id || seen.has(payment.id) || payment.subscription !== subscriptionId
      || payment.customer !== customerId) continue;
    seen.add(payment.id);
    if (payment.status !== "CONFIRMED" && payment.status !== "RECEIVED") continue;
    if (!Number.isFinite(payment.value) || Math.abs(payment.value * 100 - ASAAS_PLAN_CENTS[plan]) > 0.000001) continue;
    const end = monthAfterDueDate(payment.dueDate);
    if (end && end > paidThrough) paidThrough = end;
  }
  return {paidThrough, paidPlan: paidThrough ? plan : ""};
}

/** O cancelamento impede novas cobranças, não apaga o direito já quitado. */
export function asaasHasAccess(entitlement: AsaasEntitlement, now = Math.floor(Date.now() / 1000)) {
  return entitlement.paidThrough > now && entitlement.paidPlan !== "";
}
