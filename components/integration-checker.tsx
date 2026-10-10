"use client";
import { useState } from "react";
import { CheckCircle2, CircleDashed, ShieldCheck, RefreshCw, AlertCircle, Copy, Check, Mail } from "lucide-react";
import { Spinner } from "./ui";
import type { IntegrationCheck } from "@/lib/integration-checks";

type Template = { title: string; subject: string; dashboardLabel: string; html: string };
type Report = { checkedAt: string; checks: IntegrationCheck[] };
const smtpGuides = [
  { id: "resend", name: "Resend", host: "smtp.resend.com", port: "465", username: "resend", password: "Chave de API de envio emitida no Resend", credentialsUrl: "https://resend.com/api-keys", docsUrl: "https://resend.com/docs/send-with-supabase-smtp" },
  { id: "brevo", name: "Brevo", host: "smtp-relay.brevo.com", port: "587", username: "Login SMTP mostrado na aba SMTP da Brevo", password: "Chave SMTP emitida na Brevo", credentialsUrl: "https://app.brevo.com/settings/keys/smtp", docsUrl: "https://developers.brevo.com/docs/supabase-smtp-integration" },
] as const;
export default function IntegrationChecker({ templates, smtpDashboardUrl = "https://supabase.com/dashboard" }: { templates: Template[]; smtpDashboardUrl?: string }) {
  const [busy, setBusy] = useState(false), [report, setReport] = useState<Report | null>(null), [error, setError] = useState(""), [copied, setCopied] = useState("");
  const [provider, setProvider] = useState<"resend" | "brevo">("resend");
  const smtp = smtpGuides.find(item => item.id === provider)!;
  async function check() {
    setBusy(true); setError(""); setReport(null);
    try {
      const configResponse = await fetch("/api/auth/config", { cache: "no-store" });
      const config = await configResponse.json() as { csrf?: string };
      if (!configResponse.ok || !config.csrf) throw new Error("Atualize a página para conferir as conexões.");
      const response = await fetch("/api/platform/check", { method: "POST", headers: { "x-pedido-csrf": config.csrf }, cache: "no-store" });
      const result = await response.json() as Report & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível conferir as conexões.");
      setReport(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  async function copy(value: string, id: string) {
    try { await navigator.clipboard.writeText(value); setCopied(id); }
    catch { setError("Não foi possível copiar automaticamente. Abra o HTML abaixo e copie o texto."); }
  }
  return <section className="connection-tools" aria-labelledby="connection-title">
    <div className="connection-intro"><div><span className="eyebrow">CONEXÕES DA PLATAFORMA</span><h2 id="connection-title">Confira antes de liberar.</h2><p>Consulte o acesso e a IA diretamente do servidor. Nenhuma chave aparece no resultado.</p></div><button className="btn primary small" onClick={check} disabled={busy}>{busy ? <Spinner /> : <RefreshCw size={17} />}{busy ? "Verificando…" : "Verificar conexões"}</button></div>
    <p className="connection-note"><ShieldCheck size={16} />A verificação não gera conteúdo com IA nem envia e-mails. A entrega das mensagens e uma importação ainda precisam de testes reais.</p>
    {error && <div className="auth-error" role="alert">{error}</div>}
    <div aria-live="polite" aria-busy={busy}>{report && <><div className="connection-results">{report.checks.map(item => <article key={item.id} className={`connection-result ${item.state}`}><div>{item.state === "ok" ? <CheckCircle2 size={20} /> : item.state === "error" ? <AlertCircle size={20} /> : <CircleDashed size={20} />}</div><div><h3>{item.label}<span>{item.state === "ok" ? "Conferido" : item.state === "error" ? "Ajuste necessário" : item.state === "review" ? "Teste de entrega" : "Pendente"}</span></h3><p>{item.message}</p></div></article>)}</div><p className="connection-time">Conferido em {new Date(report.checkedAt).toLocaleString("pt-BR")}. A verificação não altera nenhuma configuração.</p></>}</div>
    <section className="smtp-setup" aria-labelledby="prototype-email-title"><h3 id="prototype-email-title">Testar sem contratar e-mail.</h3><p>O envio padrão do Supabase permite testar recuperação de senha com os e-mails da equipe do projeto. Não exige domínio próprio. O limite atual é de duas mensagens por hora.</p>
      <ol className="smtp-steps"><li>Abra o SMTP do Supabase, desative <b>Enable custom SMTP</b> e salve. Isso retira o Gmail que está recusando as credenciais.</li><li>Desative <b>Confirm email</b> em Authentication → Sign In / Providers. O cadastro entra direto; apenas a recuperação envia e-mail.</li><li>Use <b>PEDIDO_AUTH_MODE=prototype</b> e cadastre apenas os e-mails de teste em <b>PEDIDO_AUTH_TEST_EMAILS</b>, no ambiente protegido da hospedagem. As demais contas não têm acesso.</li><li>Teste o cadastro direto e a recuperação com o e-mail da equipe Supabase. Solicitar outro link consome o mesmo limite; se houver limite de envio, aguarde a próxima janela.</li></ol>
      <div className="email-template-actions"><a className="btn primary small" href={smtpDashboardUrl} target="_blank" rel="noopener noreferrer">Abrir envio de teste</a><a className="text-button" href="https://supabase.com/docs/guides/auth/auth-smtp" target="_blank" rel="noopener noreferrer">Limites do Supabase</a></div>
    </section>
    <section className="smtp-setup" aria-labelledby="smtp-title"><h3 id="smtp-title">Envio para atender clientes.</h3><p>Quando chegar a hora de liberar o cadastro ao público, escolha o serviço que enviará recuperação de senha. Essa conexão é feita uma vez para a pedido.on; cada pizzaria usa o mesmo sistema.</p>
      <div className="smtp-provider-tabs" aria-label="Provedor de envio">{smtpGuides.map(item => <button type="button" className="btn outline small" key={item.id} aria-pressed={provider === item.id} onClick={() => setProvider(item.id)}>{item.name}</button>)}</div>
      <ol className="smtp-steps"><li>Na {smtp.name}, verifique um domínio que você controla e crie o endereço remetente.</li><li>Emita a credencial de envio e preencha os campos abaixo nas configurações SMTP do Supabase.</li><li>Mantenha <b>Confirm email</b> desativado. Teste receber e abrir o e-mail de recuperação antes de liberar esse envio aos clientes.</li></ol>
      <div className="smtp-table-wrap"><table className="smtp-table"><caption>Campos do Supabase para {smtp.name}</caption><tbody>
        <tr><th scope="row">Host</th><td><code>{smtp.host}</code><button type="button" className="text-button" aria-label="Copiar host SMTP" onClick={() => copy(smtp.host, "smtp-host")}>{copied === "smtp-host" ? "Copiado" : "Copiar"}</button></td></tr>
        <tr><th scope="row">Port</th><td><code>{smtp.port}</code></td></tr>
        <tr><th scope="row">Username</th><td>{smtp.username}</td></tr>
        <tr><th scope="row">Password</th><td>{smtp.password}</td></tr>
        <tr><th scope="row">Sender email address</th><td>Endereço do seu domínio verificado no provedor</td></tr>
        <tr><th scope="row">Sender name</th><td>pedido.on</td></tr>
      </tbody></table></div><p className="connection-note">A credencial fica no campo Password do Supabase. Esta tela não solicita nem armazena essa chave. Na Brevo, use a chave SMTP e o login indicado na aba SMTP.</p>
      <div className="email-template-actions"><a className="btn outline small" href={smtp.credentialsUrl} target="_blank" rel="noopener noreferrer">Abrir {smtp.name}</a><a className="btn primary small" href={smtpDashboardUrl} target="_blank" rel="noopener noreferrer">Abrir SMTP do Supabase</a><a className="text-button" href={smtp.docsUrl} target="_blank" rel="noopener noreferrer">Instruções do provedor</a></div>
    </section>
    <div className="email-tools"><div className="email-tools-title"><Mail size={23} /><div><h3>E-mails com a cara da pedido.on.</h3><p>O template de recuperação funciona com Supabase, Resend e Brevo. Copie para Supabase Auth → Emails → Templates quando precisar atualizá-los.</p></div></div><div className="email-template-grid">{templates.map((template, index) => <article className="email-template-card" key={template.title}><span className="eyebrow">{template.dashboardLabel}</span><h4>{template.title}</h4><p>Assunto: {template.subject}</p><div className="email-template-actions"><button className="btn outline small" onClick={() => copy(template.html, "html" + index)}>{copied === "html" + index ? <Check size={15} /> : <Copy size={15} />}{copied === "html" + index ? "HTML copiado" : "Copiar HTML"}</button><button className="text-button" onClick={() => copy(template.subject, "subject" + index)}>{copied === "subject" + index ? "Assunto copiado" : "Copiar assunto"}</button></div><details><summary>Ver o HTML</summary><textarea aria-label={`HTML para ${template.title.toLowerCase()}`} value={template.html} readOnly spellCheck={false} /></details></article>)}</div><p className="connection-note">Use a origem pública atual no campo Site URL do Supabase. Inclua /redefinir-senha nas URLs de retorno. O template usa o link seguro do Supabase para recuperar a senha.</p></div>
  </section>;
}
