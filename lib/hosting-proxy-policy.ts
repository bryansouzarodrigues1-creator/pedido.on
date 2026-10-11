// Shared by the Netlify gateway and the Workers entry. No provider keys belong here.
export const PROXY_BODY_LIMIT = 5 * 1024 * 1024;
const MAX_AGE_SECONDS = 30;
const prefix = "x-pedido-proxy-";
export const proxyHeaders = {
  origin: prefix + "origin",
  timestamp: prefix + "timestamp",
  ip: prefix + "ip",
  signature: prefix + "signature",
  verified: prefix + "verified",
} as const;
const signedHeaders = [
  "authorization", "content-type", "cookie", "origin", "sec-fetch-site",
  "x-pedido-csrf", "stripe-signature", "rsc", "next-router-state-tree",
  "next-router-prefetch", "next-url",
];
export type HostingProxyConfig = {
  PEDIDO_PROXY_SECRET?: string;
  PEDIDO_PUBLIC_ORIGIN?: string;
};
export class HostingProxyError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function httpsOrigin(value: string | undefined) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash ? url.origin : "";
  } catch { return ""; }
}
export function validProxySecret(secret: string | undefined): secret is string {
  return /^[a-f0-9]{64}$/.test(secret || "");
}
function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function signingKey(secret: string) {
  const bytes = Uint8Array.from(secret.match(/../g)!, pair => parseInt(pair, 16));
  return crypto.subtle.importKey("raw", bytes, {name: "HMAC", hash: "SHA-256"}, false, ["sign", "verify"]);
}
export async function proxyBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > PROXY_BODY_LIMIT) {
    throw new HostingProxyError(413, "Envie um arquivo de até 5 MB.");
  }
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > PROXY_BODY_LIMIT) {
      await reader.cancel();
      throw new HostingProxyError(413, "Envie um arquivo de até 5 MB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export function cleanProxyHeaders(source: Headers) {
  const headers = new Headers(source);
  for (const [name] of [...headers]) {
    if (/^(?:oai-|x-oai-|x-openai-|x-pedido-proxy-|x-forwarded-|cf-)/.test(name) ||
      ["host", "forwarded", "connection", "keep-alive", "transfer-encoding", "content-length", "accept-encoding"].includes(name)) {
      headers.delete(name);
    }
  }
  return headers;
}
async function signatureMessage(request: Request, body: Uint8Array, origin: string, timestamp: string, ip: string) {
  const payload = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const digest = bytesToHex(await crypto.subtle.digest("SHA-256", payload));
  return new TextEncoder().encode(JSON.stringify([
    "pedido-proxy-v1", request.method, request.url, origin, timestamp, ip,
    signedHeaders.map(name => [name, request.headers.get(name) || ""]), digest,
  ]));
}
export async function signProxyRequest(request: Request, body: Uint8Array, config: HostingProxyConfig, clientIp: string, now = Date.now()) {
  const origin = httpsOrigin(config.PEDIDO_PUBLIC_ORIGIN), secret = config.PEDIDO_PROXY_SECRET;
  if (!origin || !validProxySecret(secret)) throw new HostingProxyError(503, "Este endereço ainda está sendo preparado.");
  const ip = /^[a-f0-9:.]{3,64}$/i.test(clientIp) ? clientIp : "anonymous";
  const timestamp = String(Math.floor(now / 1000));
  const signature = bytesToHex(await crypto.subtle.sign("HMAC", await signingKey(secret), await signatureMessage(request, body, origin, timestamp, ip)));
  return {
    [proxyHeaders.origin]: origin,
    [proxyHeaders.timestamp]: timestamp,
    [proxyHeaders.ip]: ip,
    [proxyHeaders.signature]: signature,
  };
}
export async function normalizeHostingRequest(request: Request, config: HostingProxyConfig, now = Date.now()): Promise<{request: Request; proxied: boolean}> {
  if (![...request.headers].some(([name]) => name.startsWith(prefix))) return {request, proxied: false};
  const origin = httpsOrigin(config.PEDIDO_PUBLIC_ORIGIN), secret = config.PEDIDO_PROXY_SECRET;
  const claimed = request.headers.get(proxyHeaders.origin), timestamp = request.headers.get(proxyHeaders.timestamp) || "";
  const ip = request.headers.get(proxyHeaders.ip) || "", signature = request.headers.get(proxyHeaders.signature) || "";
  const age = Math.floor(now / 1000) - Number(timestamp);
  if (!origin || !validProxySecret(secret) || claimed !== origin || !/^\d{10}$/.test(timestamp) ||
    age < -5 || age > MAX_AGE_SECONDS || !/^(?:anonymous|[a-f0-9:.]{3,64})$/i.test(ip) || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new HostingProxyError(403, "Não foi possível validar este endereço.");
  }
  const body = await proxyBody(request);
  const verified = await crypto.subtle.verify("HMAC", await signingKey(secret),
    Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16)),
    await signatureMessage(request, body, origin, timestamp, ip));
  if (!verified) throw new HostingProxyError(403, "Não foi possível validar esta solicitação.");
  const publicUrl = new URL(origin), incoming = new URL(request.url);
  publicUrl.pathname = incoming.pathname;
  publicUrl.search = incoming.search;
  const headers = cleanProxyHeaders(request.headers);
  headers.set("host", publicUrl.host);
  headers.set("x-forwarded-proto", "https");
  headers.set("cf-connecting-ip", ip);
  headers.set(proxyHeaders.verified, origin);
  return {request: new Request(publicUrl, {
    method: request.method, headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : body.buffer as ArrayBuffer,
  }), proxied: true};
}
