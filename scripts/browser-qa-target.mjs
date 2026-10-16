const publicOrigin = 'https://forno-cardapios.waves4845.chatgpt.site';
export function browserQaTarget() {
    const base = (process.env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = new URL(base);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const publicReadOnly = process.env.QA_PUBLIC_GUEST_QA === 'true' && base === publicOrigin;
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (!loopback && !publicReadOnly))
        throw Error('Use uma origem de loopback ou a URL pública autorizada com QA_PUBLIC_GUEST_QA=true.');
    return {base, publicReadOnly};
}
export async function guardPublicGuestContext(context, violations) {
    if (!browserQaTarget().publicReadOnly) return;
    // These guest tests never submit account, order, payment or generation forms.
    // Block unexpected mutation methods before any bytes reach the public site.
    await context.route('**/*', async route => {
        const request = route.request();
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
        violations.push('Método bloqueado no QA público: ' + request.method() + ' ' + new URL(request.url()).pathname);
        await route.abort('blockedbyclient');
    });
}
