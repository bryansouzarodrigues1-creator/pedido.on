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
