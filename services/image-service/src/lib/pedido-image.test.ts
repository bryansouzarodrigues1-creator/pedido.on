import { describe, expect, it, vi } from "vitest";
import { CLAIM_URL, IMAGE_MODEL, MAX_GATEWAY_RESPONSE_BYTES, handleGenerate, healthResponse } from "./pedido-image.server";

const JOB = { jobId: "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e", token: "a".repeat(64) };
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const b64 = btoa(String.fromCharCode(...PNG));

const req = (body: unknown) =>
  new Request("http://x/api/pedido-on/image", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

function stub(claimStatus: number, claimBody: unknown = {}, gateway: () => Response = () => new Response(JSON.stringify({ data: [{ b64_json: b64 }] }), { status: 200 })) {
  return vi.fn(async (url: string) => {
    if (url === CLAIM_URL) return new Response(JSON.stringify(claimBody), { status: claimStatus });
    return gateway();
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn<(u: string, i: any) => Promise<Response>>>;
}
const modelCalls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter(([u]) => u !== CLAIM_URL).length;

describe("pedido-on image endpoint", () => {
  it("health reports configured only with the managed key", async () => {
    expect(await healthResponse(undefined).json()).toEqual({ configured: false, model: IMAGE_MODEL, protocol: "pedido-image-v1" });
    expect((await healthResponse("k").json()).configured).toBe(true);
  });

  it("invalid claim (401) → 401, zero model calls", async () => {
    const f = stub(401);
    const res = await handleGenerate(req(JOB), { fetch: f, apiKey: "k" });
    expect(res.status).toBe(401);
    expect(modelCalls(f)).toBe(0);
    expect(await res.text()).not.toContain(JOB.token);
  });

  it("replay-denied claim (409) → 409, zero model calls", async () => {
    const f = stub(409);
    const res = await handleGenerate(req(JOB), { fetch: f, apiKey: "k" });
    expect(res.status).toBe(409);
    expect(modelCalls(f)).toBe(0);
  });

  it("missing managed key → 503, no network at all", async () => {
    const f = stub(200);
    const res = await handleGenerate(req(JOB), { fetch: f, apiKey: undefined });
    expect(res.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects bodies over 4KB and invalid / extra fields", async () => {
    const f = stub(200);
    expect((await handleGenerate(req("x".repeat(5000)), { fetch: f, apiKey: "k" })).status).toBe(413);
    for (const bad of [
      { ...JOB, prompt: "hack" },
      { jobId: "nope", token: JOB.token },
      { jobId: JOB.jobId, token: "A".repeat(64) },
      { jobId: JOB.jobId, token: "a".repeat(63) },
      "not json",
    ]) {
      expect((await handleGenerate(req(bad), { fetch: f, apiKey: "k" })).status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("successful claim → one model call, raw PNG bytes", async () => {
    const f = stub(200, { prompt: "pizza vermelha", asset: "logo", ratio: "1:1", protocol: "pedido-image-v1" });
    const res = await handleGenerate(req(JOB), { fetch: f, apiKey: "k" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(modelCalls(f)).toBe(1);
    const claimInit = f.mock.calls[0]![1];
    expect(claimInit.redirect).toBe("manual");
    expect(JSON.parse(claimInit.body)).toEqual(JOB);
    expect(JSON.parse(f.mock.calls[1]![1].body).model).toBe(IMAGE_MODEL);
  });

  it("malformed claim body → 401, zero model calls", async () => {
    const f = stub(200, { prompt: "x", asset: "logo", ratio: "4:3", protocol: "pedido-image-v1" });
    expect((await handleGenerate(req(JOB), { fetch: f, apiKey: "k" })).status).toBe(401);
    expect(modelCalls(f)).toBe(0);
  });

  const GOOD = { prompt: "pizza", asset: "logo", ratio: "1:1", protocol: "pedido-image-v1" };
  const withImage = (bytes: number[]) => () =>
    new Response(JSON.stringify({ data: [{ b64_json: btoa(String.fromCharCode(...bytes)) }] }));

  it("both outbound fetches use redirect:manual and a timeout signal", async () => {
    const f = stub(200, GOOD);
    await handleGenerate(req(JOB), { fetch: f, apiKey: "k" });
    for (const [, init] of f.mock.calls) {
      expect(init.redirect).toBe("manual");
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("accepts trusted prompts up to 3000 chars, rejects longer", async () => {
    const ok = stub(200, { ...GOOD, prompt: "p".repeat(3000) });
    expect((await handleGenerate(req(JOB), { fetch: ok, apiKey: "k" })).status).toBe(200);
    const long = stub(200, { ...GOOD, prompt: "p".repeat(3001) });
    expect((await handleGenerate(req(JOB), { fetch: long, apiKey: "k" })).status).toBe(401);
    expect(modelCalls(long)).toBe(0);
  });

  it("oversized gateway response (streamed, no content-length) → 502", async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(0x61);
    let sent = 0;
    const big = () =>
      new Response(new ReadableStream({ pull(c) { if (sent++ > 8) c.close(); else c.enqueue(chunk); } }));
    const res = await handleGenerate(req(JOB), { fetch: stub(200, GOOD, big), apiKey: "k" });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "generation_failed" });
    expect(sent).toBeLessThanOrEqual(Math.ceil(MAX_GATEWAY_RESPONSE_BYTES / chunk.length) + 1);
  });

  it("oversized declared content-length → 502", async () => {
    const big = () => new Response("{}", { headers: { "content-length": String(MAX_GATEWAY_RESPONSE_BYTES + 1) } });
    expect((await handleGenerate(req(JOB), { fetch: stub(200, GOOD, big), apiKey: "k" })).status).toBe(502);
  });

  it("malformed gateway JSON → 502", async () => {
    const bad = () => new Response("not json");
    expect((await handleGenerate(req(JOB), { fetch: stub(200, GOOD, bad), apiKey: "k" })).status).toBe(502);
  });

  it("rejects partial PNG signature, unknown bytes and empty images", async () => {
    for (const bytes of [[0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 1], [1, 2, 3, 4], [], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]) {
      const res = await handleGenerate(req(JOB), { fetch: stub(200, GOOD, withImage(bytes)), apiKey: "k" });
      expect(res.status).toBe(502);
    }
  });
});
