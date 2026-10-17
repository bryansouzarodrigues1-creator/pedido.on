/**
 * A publicly accessible Cloudflare Worker is NOT the trusted ChatGPT Sites edge.
 * Never accept spoofed Sites identity headers on a self-hosted origin.
 */
export function stripSitesIdentity(request: Request): Request {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (/^(?:oai-|x-oai-|x-openai-|openai-)/i.test(name)) headers.delete(name);
  }
  return new Request(request, {headers});
}


/**
 * Standalone deployments are closed until a separate, explicitly approved
 * reconciliation of live D1, private R2 media, Supabase Auth and payments.
 * Building or deploying the entire app must NOT start accepting users.
 *
 * Never read request bodies, cookies or business data while locked.
 * No endpoint (including /healthz) is considered ready in this mode.
 */
export function standaloneLaunchGate(request: Request, readiness: string | undefined): Response | null {
  if (readiness === "reconciled-and-approved") return null;
  const path = new URL(request.url).pathname;
  const isHealth = request.method === "GET" && path === "/healthz";
  return Response.json(isHealth ? {
    status: "staging-only",
    publicAppReady: false,
    productionDataMigrated: false,
    businessRoutesEnabled: false,
  } : {
    error: "Ambiente de testes em preparação. Utilize o Pizzaria.on atual.",
  }, {
    status: 503,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
