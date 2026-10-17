# Beta novo, sem migração de clientes — 17/10/2026

O responsável confirmou que **não existe clientela real** ainda. Para evitar misturar usuários fictícios e ensaios antigos, usamos um D1 e um bucket R2 totalmente novos, sem excluir qualquer recurso anterior.

## Inventário atual

- D1 limpo: `pizzaria-on-beta-20261017` (`4f83f462-997f-4269-8e77-f7daaf0c89cb`). 15 migrações originais 0000–0014 executadas com sucesso; 27 tabelas de negócio verificadas; **0 registros**.
- Bucket privado Standard: `pizzaria-on-beta-media-20261017`. Não conectar domínio público ao bucket. Não ativar R2.dev.
- Worker completo já compilado: `pizzaria-on-backend-staging-20261017`. Backend Vinext com `standaloneLaunchGate` em modo fechado, verificações automatizadas de segurança.
- Supabase Auth original: `lxavrmzafumqmbswtfbe` (ativo). Novos segredos do Worker: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `AUTH_SESSION_KEY` criptograficamente gerada, configurados **sem expor os valores** no GitHub.
- O pipeline Cloudflare Builds está conectado ao repositório `bryansouzarodrigues1-creator/pedido.on` e à branch `infra/cloudflare-staging-deploy-gated-20261017`. Seu deploy automático foi **desligado**; exige ação separada e revisão.
- Fluxos comerciais e IA externos continuam inativos no Worker. O código não libera endpoints sem `PEDIDO_INDEPENDENT_LAUNCH_GATE=reconciled-and-approved`.
- Produção Sites e galeria Lovable continuam disponíveis nos endereços originais, sem transferência de dados.

## Prova necessária antes de aceitar o primeiro pizzaiolo no Worker

1. Implantar via Wrangler o backend com os **novos IDs** D1/R2; confirmar bindings e segredos após o deploy.
2. Conferir se Cloudflare reabilitou domínio `workers.dev`/previews ao implantar; desligar até a homologação.
3. Testar registro público/email, confirmação automática Supabase, login/cookies/CSRF, criação de pizzaria, publicação, pedido de teste e isolamento multi-tenant.
4. Validar uploads privados R2, delivery, suporte e painel do pizzaiolo (sem vazamento entre contas).
5. Só abrir acesso com aprovação específica, sem Asaas real nem cobranças até teste financeiro.
6. Se a interface Lovable continuar só galeria, apontar claramente o fluxo funcional do novo servidor quando aprovado; não afirmar que já migrou o sistema.

Os 16 registros antigos de staging pertencem a protótipos e ficam intactos num banco separado. Ninguém precisa exportar a produção vazia do Sites para começar o beta novo; o histórico do Sites pode permanecer arquivado.

## Atenção

Nem o build nem a criação do banco provam que os fluxos funcionam. Não anunciar o novo domínio como funcional antes da verificação fim a fim.


## Atualização — primeiro beta acessível (17/10/2026)

**Novo link beta:** https://pizzaria-on-backend-staging-20261017.bryansouzarodrigues06.workers.dev/criar

- O backend completo foi reconstruído e implantado via Cloudflare Workers Builds com os novos IDs D1/R2. O D1 limpo tem 27 tabelas e zero registros na validação de início de beta.
- Supabase URL e chave publicável configuradas no Worker como bindings secretos; `AUTH_SESSION_KEY` gerada com aleatoriedade criptográfica. Nunca compartilhar valores no repositório.
- Cobranças SaaS/Asaas, IA paga e notificações push estão **desativadas** no backend beta. Não receber pagamento ou prometer IA generativa remota.
- Verificações externas GET: `/`, `/criar`, `/entrar`, `/manifest.webmanifest`, `/api/auth/config?registration=1` responderam 200. `directSignup=true`, `inviteRequired=false`; APIs privadas `/api/restaurants` e `/api/admin/status` responderam 401 sem autenticação.
- As 12 rotas `/demo/<style-id>` responderam 200 no novo servidor. O Lovable é apenas galeria pública, com cópia **manual** do briefing entre origens.
- O domínio `workers.dev` foi habilitado para teste beta após essas verificações. Previews separados permanecem desligados. O pipeline GitHub está conectado, mas o **deploy automático permanece bloqueado** para não reativar prévias nem trocar configurações sem revisão.
- Nenhum registro do Sites antigo foi importado; o backup de 13/10 permanece arquivado no staging antigo. Não há clientes reais, conforme informação do titular.

### Falta para homologar comercialmente

1. Fazer cadastro de **uma conta de teste**, entrar, criar e publicar um cardápio, verificar imagens e links públicos.
2. Simular **um pedido** com pagamento na entrega em outro telefone, conferir no painel e atualizar status. Verificar isolamento entre pizzarias.
3. Testar fluxo Pix do lojista e comprovante sem movimentar dinheiro real; confirmar que arquivos privados R2 não vazam por endereço público.
4. Confirmar OCR de fotos reais com conferência obrigatória de todos os itens e preços; importação por iFood pode sofrer 403.
5. Resolver recuperação de senha/e-mail, notificação de pedidos, IA remota e pagamento de assinaturas antes de abrir comercialização em escala.
6. Configurar alerta de faturamento Cloudflare; franquia de R2 não é teto de gasto garantido.

**Decisão atual:** beta público para QA limitado, NÃO plataforma comercial 100% homologada. Antes de convidar dezenas de lojas, coletar resultado do primeiro teste autenticado.
