const API = 'https://api.browserbase.com/v1';
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const bounded = (promise, ms) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tempo de conexão encerrado.')), ms); })])
    .finally(() => clearTimeout(timer));
};

export function browserbaseConnectUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'wss:' || url.port || url.username || url.password ||
        !(url.hostname === 'browserbase.com' || url.hostname.endsWith('.browserbase.com'))) throw new Error();
    return value;
  } catch { throw new Error('O Browserbase não retornou uma conexão válida.'); }
}

export function browserbaseSessionOptions(projectId) {
  if (projectId && !safeId(projectId)) throw new Error('Confira o identificador do projeto Browserbase.');
  return {...(projectId ? {projectId} : {}), timeout: 90, keepAlive: false, proxies: false,
    browserSettings: {solveCaptchas: false, advancedStealth: false, verified: false,
      recordSession: false, logSession: false, allowedDomains: ['www.ifood.com.br'],
      viewport: {width: 1280, height: 900}}};
}

/** One owned short session. No retries, persistent profile, AI model or paid add-ons. */
export async function withBrowserbase({apiKey, projectId, chromium, run, freeBudgetConfirmed, fetchImpl = fetch}) {
  if (!freeBudgetConfirmed) throw new Error('Confirme no painel Browserbase que esta tentativa cabe na franquia gratuita.');
  if (typeof apiKey !== 'string' || !apiKey.trim() || /[\r\n]/.test(apiKey))
    throw new Error('Configure BROWSERBASE_API_KEY no segredo do ambiente de execução.');
  const options = browserbaseSessionOptions(projectId);
  const request = async (path, body, timeout = 15000) => {
    let response;
    try { response = await fetchImpl(API + path, {method: 'POST', redirect: 'error',
      headers: {'X-BB-API-Key': apiKey, 'Content-Type': 'application/json'},
      body: JSON.stringify(body), signal: AbortSignal.timeout(timeout)}); }
    catch { throw new Error('Não foi possível contactar a API Browserbase; nenhuma repetição automática foi feita.'); }
    if (!response.ok) throw new Error(`Browserbase recusou a operação (HTTP ${response.status}).`);
    return response;
  };
  let browser, id, result, error, releaseRequested = false;
  try {
    const response = await request('/sessions', options);
    let session;
    try { session = await response.json(); }
    catch { throw new Error('O Browserbase retornou uma resposta inválida.'); }
    if (!safeId(session?.id)) throw new Error('O Browserbase não retornou uma sessão identificável; confira o painel.');
    id = session.id;
    const connectUrl = browserbaseConnectUrl(session.connectUrl);
    try { browser = await chromium.connectOverCDP(connectUrl, {timeout: 15000}); }
    catch { throw new Error('Não foi possível conectar ao navegador Browserbase.'); }
    result = await run(browser);
  } catch (caught) { error = caught; }
  finally {
    if (browser) await bounded(browser.close().catch(() => {}), 5000).catch(() => {});
    if (id) {
      try { await request('/sessions/' + id, {status: 'REQUEST_RELEASE'}, 8000); releaseRequested = true; }
      catch {
        // The provider may already have terminated a non-keepAlive session.
        // Keep the safe warning; its 90-second provider timeout remains the backstop.
        error = new Error('Não foi possível confirmar o encerramento Browserbase. Confira a sessão no painel; o limite configurado é de 90 segundos.');
      }
    }
  }
  if (error) throw error;
  return {result, session: {provider: 'browserbase', id, timeoutSeconds: 90, releaseRequested,
    proxy: false, captchaSolving: false, advancedStealth: false, persistentContext: false,
    recording: false, logs: false}};
}
