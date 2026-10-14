import test from "node:test";
import assert from "node:assert/strict";
import {
  ASAAS_PLAN_CENTS, asaasEntitlement, asaasHasAccess, monthAfterDueDate,
  readAsaasConfig, safeAsaasInvoiceUrl, validAsaasWebhookToken,
} from "../lib/asaas-policy.ts";

test("Asaas stays disabled without explicit approval and matched environment keys", () => {
  const base = {
    PEDIDO_BILLING_ENABLED: "true", PEDIDO_BILLING_PROVIDER: "asaas",
    ASAAS_ENV: "sandbox", ASAAS_API_KEY: "$aact_hmlg_example",
    ASAAS_WEBHOOK_TOKEN: "this-is-a-test-token-with-minimum-32-characters",
  };
  assert.equal(readAsaasConfig(base).enabled, true);
  const shared="$aact_hmlg_"+"fixture".repeat(8);
  assert.equal(readAsaasConfig({...base,ASAAS_API_KEY:shared,ASAAS_WEBHOOK_TOKEN:shared}).enabled,false);
  assert.equal(readAsaasConfig({...base, PEDIDO_BILLING_ENABLED: "false"}).enabled, false);
  assert.equal(readAsaasConfig({...base, PEDIDO_BILLING_PROVIDER: "stripe"}).enabled, false);
  assert.equal(readAsaasConfig({...base, ASAAS_API_KEY: "$aact_prod_example"}).enabled, false);
  assert.equal(readAsaasConfig({...base, ASAAS_ENV: "production"}).enabled, false);
  assert.equal(readAsaasConfig({...base, ASAAS_ENV: "wrong"}).enabled, false);
  assert.equal(readAsaasConfig({...base, ASAAS_WEBHOOK_TOKEN: "short"}).enabled, false);
  assert.equal(readAsaasConfig({...base, ASAAS_WEBHOOK_TOKEN: "a".repeat(32) + " "}).enabled, false);
  assert.equal(readAsaasConfig({...base, ASAAS_ENV: "production", ASAAS_API_KEY: "$aact_prod_example"}).baseUrl, "https://api.asaas.com/v3");
});

test("invoice links only allow a direct HTTPS Asaas invoice for the current environment", () => {
  assert.equal(safeAsaasInvoiceUrl("https://sandbox.asaas.com/i/sandbox123", "sandbox"), "https://sandbox.asaas.com/i/sandbox123");
  assert.equal(safeAsaasInvoiceUrl("https://www.asaas.com/i/paid123", "production"), "https://www.asaas.com/i/paid123");
  assert.equal(safeAsaasInvoiceUrl("https://www.asaas.com/000/i/paid123", "production"), "https://www.asaas.com/000/i/paid123");
  for (const bad of [
    "https://sandbox.asaas.com.evil.test/i/foo",
    "https://user:password@sandbox.asaas.com/i/foo",
    "http://sandbox.asaas.com/i/foo",
    "https://sandbox.asaas.com:443@evil.test/i/foo",
    "https://sandbox.asaas.com/redirect",
    "javascript:alert(1)",
    "/i/not-absolute",
  ]) assert.equal(safeAsaasInvoiceUrl(bad, "sandbox"), null, bad);
  assert.equal(safeAsaasInvoiceUrl("https://sandbox.asaas.com/i/foo", "production"), null);
});

test("webhook token requires equality and a sufficiently strong configured secret", async () => {
  const token = "01234567890123456789012345678901";
  assert.equal(await validAsaasWebhookToken(token, token), true);
  assert.equal(await validAsaasWebhookToken(token + "a", token), false);
  assert.equal(await validAsaasWebhookToken(null, token), false);
  assert.equal(await validAsaasWebhookToken("a".repeat(32), token), false);
  assert.equal(await validAsaasWebhookToken("short", "short"), false);
});

test("period starts from due date rather than webhook delivery and preserves month-end", () => {
  assert.equal(new Date(monthAfterDueDate("2026-01-31") * 1000).toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(new Date(monthAfterDueDate("2028-01-31") * 1000).toISOString(), "2028-02-29T00:00:00.000Z");
  assert.equal(new Date(monthAfterDueDate("2026-11-10") * 1000).toISOString(), "2026-12-10T00:00:00.000Z");
  for (const invalid of ["2026-02-30", "2026-13-02", "2026-1-3", "", "9999-01-01"]) assert.equal(monthAfterDueDate(invalid), null);
});

test("entitlement only follows verified current subscription, customer, price and paid invoices", () => {
  const paid = {id:"pay_1", subscription:"sub_a", customer:"cus_a", status:"CONFIRMED", value:49, dueDate:"2026-10-11"};
  const result = asaasEntitlement([
    {...paid, id:"pending", status:"PENDING", dueDate:"2027-10-11"},
    {...paid, id:"other-sub", subscription:"sub_other", dueDate:"2027-10-11"},
    {...paid, id:"other-customer", customer:"cus_other", dueDate:"2027-10-11"},
    {...paid, id:"other-price", value:89, dueDate:"2027-10-11"},
    paid, paid,
  ], "sub_a", "cus_a", "essencial");
  assert.deepEqual(result, {paidPlan:"essencial", paidThrough:monthAfterDueDate("2026-10-11")});
  assert.equal(asaasHasAccess(result, result.paidThrough - 1), true);
  assert.equal(asaasHasAccess(result, result.paidThrough), false);
  assert.equal(ASAAS_PLAN_CENTS.essencial, 4900);
});

test("reversing an old charge does not revoke access from a later valid renewal", () => {
  const base = {subscription:"sub_a", customer:"cus_a", value:89};
  const invoices = [
    {...base, id:"pay_old", status:"REFUNDED", dueDate:"2026-09-01"},
    {...base, id:"pay_new", status:"RECEIVED", dueDate:"2026-10-01"},
  ];
  assert.deepEqual(asaasEntitlement(invoices, "sub_a", "cus_a", "profissional"), {
    paidPlan:"profissional", paidThrough:monthAfterDueDate("2026-10-01"),
  });
  assert.deepEqual(asaasEntitlement(invoices.map(p=>({...p,status:"REFUNDED"})), "sub_a", "cus_a", "profissional"), {paidThrough:0,paidPlan:""});
  assert.deepEqual(asaasEntitlement([], "sub_a", "cus_a", "rede"), {paidThrough:0,paidPlan:""});
});
