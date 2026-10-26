const publicOrigins = new Set(['https://forno-cardapios.waves4845.chatgpt.site','https://pizzaria-on.netlify.app']);
export function browserQaTarget() {
    const base = (process.env.QA_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = new URL(base);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const publicReadOnly = process.env.QA_PUBLIC_GUEST_QA === 'true' && publicOrigins.has(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (!loopback && !publicReadOnly))
        throw Error('Use uma origem de loopback ou a URL pública autorizada com QA_PUBLIC_GUEST_QA=true.');
    return {base, publicReadOnly};
}
export async function guardPublicGuestContext(context, violations) {
    if (!browserQaTarget().publicReadOnly) return;
    // These guest tests never submit account, order, payment or generation forms.
    // Block application mutations. Let the site's normal Cloudflare security
    // verification run; it is not an account/order/payment/generation request.
    await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        // Analytics is deliberately excluded from public QA; it must not inflate
        // the owner's production visit counters or be mistaken for a business write.
        if(request.method()==='POST'&&publicOrigins.has(url.origin)&&url.pathname==='/api/site-events')return route.abort('blockedbyclient');
        const securityCheck = request.method() === 'POST' && publicOrigins.has(url.origin) && (url.pathname.startsWith('/cdn-cgi/challenge-platform/') || (url.origin === 'https://pizzaria-on.netlify.app' && url.pathname === '/.netlify/submit-challenge'));
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || securityCheck) return route.continue();
        violations.push('Método bloqueado no QA público: ' + request.method() + ' ' + new URL(request.url()).pathname);
        await route.abort('blockedbyclient');
    });
}
