# Migração do Pizzaria.on sem recriar o SaaS com créditos Lovable

> **Atualização confirmada em 17/10/2026, após a ativação R2:** a seção abaixo
> foi escrita antes de provisionarmos Cloudflare e é histórica. O estado ATUAL
> não é mais "0 D1/R2": existe D1 `pizzaria-on-staging-20261017`, 27 tabelas,
> com **16 registros do backup parcial de 13/10**, e bucket R2 **Standard privado**
> `pizzaria-on-staging-private-20261017`. Não há objetos R2 antigos recuperados.
> O Worker isolado `pizzaria-on-staging-guard-20261017` possui ambos os
> bindings, mas está sem domínio/prévia pública e retorna 503 em todas as rotas.
> O build Vinext independente foi testado com **IDs reais de staging**, sem
> deploy, no GitHub (PR #45). O Lovable publicou SOMENTE a galeria
> [Pizzaria.on Estilos](https://pizzaria-on-estilos.lovable.app), com as 12
> referências HTTP 200; cadastro/pedidos reais permanecem no
> [ChatGPT Sites](https://forno-cardapios.waves4845.chatgpt.site/criar).
> **A migração integral continua pendente**, pois não há exportação atual de
> todos os registros/objetos do Sites, nem segredos/serviços externos
> homologados no Worker. Não alterar Asaas, Supabase, clientes, domínio,
> cobranças ou R2 privado enquanto estiver nesse estado.
>
> Logs de execução e regras de segurança estão em
> `pizzaria.on-chat/docs/INFRA-CLOUDFLARE-STAGING-2026-10-17.md`.
> O CI de produção público passou 16/16 testes HTTP anônimos na PR #44,
> sem provar pedidos em dois aparelhos ou cobrança real.


Estado em 17/10/2026 — **PR experimental / sem implantação**.

## Decisão técnica

**Objetivo:** tornar o servidor do Pizzaria.on independente do ChatGPT Sites e manter o Lovable como plataforma visual e serviço de IA. Fazer o backend funcionar primeiro é requisito para não transformar o projeto Lovable num protótipo sem pedidos/contas.

Os serviços já utilizados pela aplicação são:
- **D1 Sites**: contas internas, pizzarias, produtos, pedidos, eventos, assinaturas, limites e reserva de chamadas de IA.
- **R2 Sites**: logos, imagens, capas e comprovantes privados.
- **Supabase Auth existente**: e-mail/senha e potencial Google, sem transferir senhas.
- **Pedido On Estúdio (Lovable)**: endpoints autenticados de geração de texto/imagem, com protocolo de claim de trabalho.
- **Asaas existente**: cobrança SaaS e webhooks, separados do Pix de cada pizzaria.
- **GitHub original**: fonte única de verdade, main estável.

Não habilitar um segundo banco Lovable/Supabase por conveniência. O Supabase atual é o serviço de autenticação; dados operacionais são D1. Não pedir à IA que faça CRUD novo sobre estruturas incompatíveis.

## Bloqueio real confirmado por API, sem mutações

Cloudflare conectado ao ChatGPT na conta ID `00a2881459ce746997deff992e55ca11`:
- `GET /accounts/{id}/d1/database`: **0 bases**;
- `GET /accounts/{id}/workers/scripts`: um Worker não relacionado (`nexus-ai`);
- listagem de buckets R2: devolveu indicação de **R2 não habilitado**.

Portanto, **o D1/R2 atual do ChatGPT Sites não aparece na conta Cloudflare conectada**. Não copiar apenas a configuração do D1; os dados e arquivos precisariam ser exportados/restaurados de forma legítima antes de trocar a origem. Não criar bases ou habilitar R2 sem verificar preços/permissões com o proprietário.

O projeto Supabase Auth existente (`lxavrmzafumqmbswtfbe`) foi localizado como `ACTIVE_HEALTHY`. Nenhuma alteração nas contas ou senhas.

Git Sync do Lovable está ligado à conta GitHub correta no painel, mas **não está conectado ao repositório de produção**. O GitHub API connector e o Git Sync são recursos distintos. A ligação Git Sync de um projeto novo tende a criar um repositório novo; nunca force-push ou reescrever `pedido.on/main` na tentativa de importá-lo.

## O que esta PR implementa

- `PEDIDO_SELF_HOSTED=true` ativa o build integral Vinext como Worker Cloudflare independente.
- `PEDIDO_D1_DATABASE_ID` e `PEDIDO_R2_BUCKET_NAME` referenciam os recursos **da nova hospedagem**, quando criados.
- A versão Sites padrão permanece exatamente como antes.
- O Worker independente rejeita o uso de cabeçalhos `oai-authenticated-user-*` e outros que qualquer visitante poderia falsificar fora da borda Sites. O login Supabase continua sendo a identidade externa autorizada.
- CI de build sem tokens nem alterações de banco. Os IDs simulados são **somente** para testar compilação, não são dados migrados.

Isto é a preparação do **backend inteiro**, não a afirmação de que já existe hospedagem operacional. A interface completa continua no repositório, e uma futura interface Lovable deve chamar a API do backend independente com sessão segura, **não** expor D1, R2, tokens de IA ou Asaas ao navegador.

## Ordem para concluir sem desperdiçar créditos

1. **Backups do Sites, primeiro.** Na tela Database do ChatGPT Sites, identificar exportação integral consistente de D1 (schema + linhas), e dos objetos R2 inclusive privados. Conferir volumes, relações, proprietário e hashes. Não excluir nada. Se a interface não oferecer exportação, parar: é necessária ferramenta oficial com essa permissão.
2. **Identificar custos reais da hospedagem.** Cloudflare atual não tem D1 nem R2 criados; conferir cotas/plano antes de habilitar. Criar staging separado apenas após consentimento e orçamento.
3. **Restaurar em staging.** Rodar migrações/drizzle existentes em nova base vazia ou restaurar dump consistente, validando contagens sem copiar dados reais para testes desnecessários. Inventariar arquivos R2 e permissões. Nunca enviar dump público ao GitHub.
4. **Copiar configurações por canais secretos**, sem trocar a `AUTH_SESSION_KEY` do ambiente original nem divulgar valores em chat. Configurar o mesmo Supabase URL/chave pública; a chave de sessão pertence a secret do servidor. Rever redirecionamentos e Google OAuth para o novo domínio; novo domínio não herda cookies, clientes farão login novamente.
5. **Subir Worker de staging** com a fonte deste repositório e IDs D1/R2 corretos. Rotas devem passar smoke tests: cadastro, handoff da ideia, leitura de OCR, loja pública, mídia privada, meio a meio, pedido e checkout fictício, admin e IA com controle de cotas.
6. **Lovable:** só depois escolher projeto separado. Vincular o **novo repo criado pelo Git Sync** e portar telas sem refazer banco, autenticação ou cálculo de pedidos. Usar GitHub para mudanças grandes, créditos Lovable para ajustes de IA/experiência com valor real. O **Pedido On Estúdio** permanece intacto.
7. **Cutover condicionado.** Conferir Asaas e webhooks, link público e OAuth, plano de rollback, índices e contagem D1, objetos R2 e cliente Android. Não apagar a versão Sites até homologação e backup final.

## Segurança e faturamento

- Não compartilhar dump de D1, certificados, senhas, JWTs, identificadores de sessão ou chaves Asaas no Lovable, em prompts ou commits.
- Dados pessoais e sessões devem ficar atrás do backend autenticado, com escopo de proprietário.
- Não enviar pedidos, efetuar cobrança real, consumir geração paga ou mudar enforcement do trial durante a migração técnica.
- Serviços de IA não serão automaticamente transferidos. O backend novo precisa reconfigurar endpoints, claims, segredos e limites existentes, e testar resposta real antes de ativar a função comercial.
- Excluir/ignorar exportações locais sensíveis e não introduzir `NEXT_PUBLIC_*` / `VITE_*` com segredos.
- O motor OCR atual continua local no navegador; migrar hospedagem não melhora sozinho precisão do OCR nem conserta cardápios reais difíceis.

## Critério objetivo de conclusão

Não chamar de migração completa enquanto **cadastro existente**, **dados D1**, **arquivos R2**, **IA com cotas**, **Asaas**, **pedidos**, **PWA** e **URLs** não tiverem sido validados em staging e cutover. CI verde = software compila, não = dados migrados.
