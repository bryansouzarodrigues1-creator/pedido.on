export type IntegrationCheck = {
  id: string;
  label: string;
  state: "ok" | "pending" | "error" | "review";
  message: string;
};
type ProbeFetch = typeof fetch;

export async function checkSupabase(
  config: { origin: string; key: string; sessionKey: string; emailReady: boolean; googleEnabled?: boolean; prototype?: boolean },
  fetcher: ProbeFetch = fetch,
): Promise<IntegrationCheck[]> {
  const checks: IntegrationCheck[] = [{
    id: "sessions", label: "Proteção das sessões",
    state: /^[a-f0-9]{64}$/.test(config.sessionKey) ? "ok" : "pending",
    message: /^[a-f0-9]{64}$/.test(config.sessionKey)
      ? "Chave interna configurada para proteger as sessões no servidor."
      : "Configure AUTH_SESSION_KEY no ambiente protegido da hospedagem.",
  }];
  let validOrigin = false, googleProvider: boolean | null = null;
  try {
    const url = new URL(config.origin);
    validOrigin = url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  } catch { /* An absent or malformed configuration cannot trigger a request. */ }
  if (!validOrigin || !config.key) {
    checks.push({ id: "supabase", label: "Conexão com Supabase", state: "pending", message: "Selecione o projeto da pizzaria.on e configure sua URL e chave publicável na hospedagem." });
  } else {
    try {
      const response = await fetcher(config.origin.replace(/\/$/, "") + "/auth/v1/settings", {
        headers: { apikey: config.key }, method: "GET", redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        checks.push({ id: "supabase", label: "Conexão com Supabase", state: "error", message: response.status === 401 || response.status === 403
          ? "A chave não foi aceita. Confira se ela pertence ao projeto configurado."
          : `O serviço de acesso não respondeu como esperado (HTTP ${response.status}). Confira se o projeto está ativo.` });
      } else {
        const settings = await response.json() as { external?: { email?: unknown; google?: unknown }; disable_signup?: unknown; mailer_autoconfirm?: unknown };
        if (!settings || typeof settings.external?.email !== "boolean" || typeof settings.disable_signup !== "boolean" || typeof settings.mailer_autoconfirm !== "boolean") throw new Error("Unexpected settings");
        googleProvider = typeof settings.external.google === "boolean" ? settings.external.google : null;
        checks.push(
          { id: "supabase", label: "Conexão com Supabase", state: "ok", message: "O serviço de acesso respondeu à chave deste projeto." },
          { id: "email-login", label: "Acesso por e-mail e senha", state: settings.external.email ? "ok" : "error", message: settings.external.email ? "O provedor de e-mail está habilitado." : "Habilite o provedor de e-mail em Supabase Auth." },
          { id: "signup", label: "Cadastro de pizzaiolos", state: settings.disable_signup ? "error" : "ok", message: settings.disable_signup ? "O projeto está bloqueando novos cadastros. Habilite o cadastro em Supabase Auth." : "O projeto permite criar contas." },
          { id: "confirmation", label: "Cadastro direto", state: settings.mailer_autoconfirm ? "ok" : "error", message: settings.mailer_autoconfirm ? "O cadastro libera acesso direto, sem enviar mensagem de confirmação." : "Desative Confirm email em Authentication → Sign In / Providers para liberar o cadastro direto." },
        );
      }
    } catch {
      checks.push({ id: "supabase", label: "Conexão com Supabase", state: "error", message: "Não foi possível conferir o serviço de acesso. Verifique a URL, a chave e se o projeto está ativo." });
    }
  }
  checks.push({ id: "google-login", label: "Acesso com Google", state: googleProvider === true ? config.googleEnabled ? "review" : "pending" : googleProvider === false && config.googleEnabled ? "error" : "pending", message: googleProvider === true
    ? config.googleEnabled ? "O Google está habilitado no provedor e no site. Esta consulta não executa o login: confira o ciclo completo, a URL de retorno e a conta criada." : "O Google está habilitado no Supabase. Teste o ciclo completo e ative PEDIDO_GOOGLE_ENABLED na hospedagem."
    : googleProvider === false ? "Configure o cliente OAuth no provedor Google do Supabase e teste o retorno aa pizzaria.on." : "Conecte o projeto Supabase e confira seu provedor Google. A conexão não foi confirmada." });
  checks.push({ id: "smtp", label: "Entrega dos e-mails", state: config.prototype || config.emailReady ? "review" : "pending", message: config.prototype
    ? "Acesso restrito às contas autorizadas. O SMTP padrão do Supabase permite testar recuperação com os e-mails da equipe, sem domínio próprio. Esta consulta não comprova recebimento: desative o SMTP personalizado e teste Esqueci minha senha. O cadastro não envia e-mail."
    : config.emailReady
    ? "O envio está marcado como testado na hospedagem. Esta verificação não envia mensagens: confirme a entrega e os links com um destinatário externo."
    : "Configure SMTP próprio e teste recuperação de senha. Depois ative PEDIDO_EMAIL_DELIVERY_READY. Cadastro e login funcionam sem envio de e-mail." });
  return checks;
}

export async function checkOpenAi(
  config: { key: string; model: string; enabled: boolean },
  fetcher: ProbeFetch = fetch,
): Promise<IntegrationCheck[]> {
  if (!config.key) return [{ id: "openai", label: "Conexão com a IA", state: "pending", message: "Configure OPENAI_API_KEY no ambiente protegido da hospedagem. A conexão do plugin, sozinha, não configura a chave do site." }];
  try {
    const response = await fetcher("https://api.openai.com/v1/models/" + encodeURIComponent(config.model), {
      method: "GET", headers: { Authorization: "Bearer " + config.key },
      redirect: "manual", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const message = response.status === 401 ? "A chave da IA não foi aceita. Confira a chave cadastrada na hospedagem."
        : response.status === 403 ? "A chave não pode consultar este modelo. Confira as permissões da chave e do projeto da API."
        : response.status === 404 ? "O modelo configurado não está disponível para este projeto da API."
        : response.status === 429 ? "O provedor limitou a consulta. Confira os limites e o faturamento da conta da API."
        : `O provedor de IA não respondeu como esperado (HTTP ${response.status}). Tente novamente depois.`;
      return [{ id: "openai", label: "Conexão com a IA", state: "error", message }];
    }
    const model = await response.json() as { id?: unknown; object?: unknown };
    if (!model || model.id !== config.model || model.object !== "model") throw new Error("Unexpected model");
    return [
      { id: "openai", label: "Conexão com a IA", state: "ok", message: "A chave foi aceita na consulta do modelo. Esta consulta não confirma saldo nem permissão para gerar respostas: faça uma importação de teste antes de liberar aos clientes." },
      { id: "ai-activation", label: "Importação por IA", state: config.enabled ? "ok" : "pending", message: config.enabled ? "A importação está ativada no site, com os limites de uso configurados." : "A conexão respondeu, mas a importação está desativada. Conclua o teste e configure PEDIDO_AI_ENABLED=true." },
    ];
  } catch {
    return [{ id: "openai", label: "Conexão com a IA", state: "error", message: "Não foi possível consultar o provedor da IA. Confira a configuração ou tente novamente depois." }];
  }
}
