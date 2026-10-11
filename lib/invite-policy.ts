/** Convites fechados para beta, nunca enviados ao cliente na configuração pública. */
export function inviteConfigured(value: string | undefined) {
  return typeof value === "string" && value.length >= 16 && value.length <= 128 && !/\s/.test(value);
}
export async function matchesInvite(provided: string | undefined, configured: string | undefined) {
  if (!inviteConfigured(configured) || typeof provided !== "string" || provided.length > 128) return false;
  // Digest compare avoids length-dependent string short circuits.
  const digest = async (str: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)));
  const [a, b] = await Promise.all([digest(provided), digest(configured!)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
