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
