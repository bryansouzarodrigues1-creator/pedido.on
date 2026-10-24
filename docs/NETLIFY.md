# Netlify — entrega de 24/10/2026

## Situação confirmada

O projeto **pizzaria-on** foi criado na Netlify e está ligado à branch main de bryansouzarodrigues1-creator/pedido.on. O deploy de produção compila e está publicado com **acesso privado da Netlify**. O endereço reservado é https://pizzaria-on.netlify.app .

**Ainda não considerar o endereço pronto para clientes.** A página inicial abriu na sessão autenticada da Netlify, mas a consulta privada a /api/hosting retornou HTTP 403, com “Não foi possível validar esta solicitação.” Uma consulta GET sem criação de dados pela função Node também retornou o mesmo erro. A reconstrução sem cache concluiu, mas não resolveu essa validação.

A revisão automática recusou a ação **Make public** porque ela torna o projeto privado acessível a qualquer pessoa na internet. A mudança não foi executada nem contornada. Falta autorização explícita para essa audiência e a conferência do caminho anônimo real. Não descrever a publicação pública ou a conexão assinada de produção como homologadas.

## O que foi entregue

O primeiro build falhou ao resolver um import fora da pasta base: file:///lib/netlify-proxy.ts. A correção emite um pacote completo em deploy/netlify/generated/, com as duas funções e as duas políticas compartilhadas. O netlify.toml aponta para esse pacote. As fontes canônicas continuam únicas, e os arquivos gerados ficam fora do Git.

| Parte | Hospedagem mantida |
| --- | --- |
| Novo endereço e funções de encaminhamento | Netlify |
| Aplicativo React/Vinext e API | Sites/Workers atual, v86 |
| Pizzarias, pedidos e sessões | D1 atual |
| Fotos e comprovantes | R2 atual |
| Contas e senhas | Supabase Auth atual |
| Serviço de criação | Lovable atual |

A chave exclusiva foi cadastrada como segredo na produção Netlify e no servidor Sites, com PEDIDO_PUBLIC_ORIGIN. Nenhuma chave de sessão, Supabase, IA ou pagamento foi copiada para a Netlify. O servidor Sites foi republicado com a mesma v86 e ambiente revisão 14. Não houve migração ou gravação de pizzaria nesta entrega.

## Validação

- **618 testes aprovados** na candidata Windows, incluindo a regressão que prepara o pacote e carrega as duas funções depois de remover as fontes externas da fixture.
- TypeScript e build completos aprovados no mesmo CI; Chrome da candidata e verificações públicas existentes aprovados.
- Netlify confirmou um deploy preview e os deploys de produção, com uma Function Node e uma Edge Function.
- O espelho completo do código principal coincide por SHA de árvore, incluindo a correção de empacotamento.
- O CI do espelho Lovable falhou antes de disponibilizar etapas. Esse CI não é declarado aprovado.
- Nenhum pagamento, pedido, conta, e-mail ou geração de IA foi criado por estas conferências.

O teste completo local iniciado antes do reinício da sessão perdeu seu arquivo de resultado; o total 618 acima vem do log preservado pelo GitHub. Os testes externos de serviços nos fixtures continuam simulados; os builds Netlify e a consulta privada descrita acima são reais.

## Configuração e retomada

| Campo Netlify | Valor |
| --- | --- |
| Repositório | bryansouzarodrigues1-creator/pedido.on |
| Branch | main |
| Base | deploy/netlify |
| Build | node ../../scripts/prepare-netlify.mjs |
| Publish | public, relativo à base |
| Functions | generated/functions |
| Edge Functions | generated/edge-functions |
| Node | 24 |

Na Netlify, PEDIDO_BACKEND_ORIGIN aponta para https://forno-cardapios.waves4845.chatgpt.site e PEDIDO_PUBLIC_ORIGIN para https://pizzaria-on.netlify.app. PEDIDO_PROXY_SECRET é secreto e precisa estar disponível em Builds, Functions e Runtime. O valor de produção foi atualizado; desenvolvimento local continua sem ele. Não registrar valores, cookies, assinaturas ou dados de logs no repositório.

Próximo marco: após autorização explícita da audiência, tornar somente a produção pública; as prévias permanecem privadas. Validar /api/hosting até retornar origin correto, viaNetlify=true e dataReady=true; depois conferir início, calculadora, acesso por e-mail e negativas de autorização. Se a assinatura continuar rejeitada, diagnosticar e corrigir antes de divulgar o endereço. Não desabilitar a assinatura ou as regras de propriedade/CSRF.

Google login e CAPTCHA não estavam ativados no ambiente conferido. Não habilitá-los por causa desta publicação. Se esses recursos forem ativados depois, cadastrar somente os callbacks/hostnames exatos do novo domínio e preservar os antigos. Recuperação de senha e validações financeiras mantêm seus limites anteriores.

Os endereços Sites e Lovable permanecem disponíveis durante a preparação. Não desligar D1/R2/Supabase ou apontar o frontend para outro banco para contornar a validação.

## Referências

- PR principal #102, merge beb000a05d69f7bad6ee10b3fb1740a6ad4bea21.
- Espelho #56, merge ee2439b7f8690a3d11e409bc6dcbf628c5b1dc34.
- Árvore funcional compartilhada: 68c67b21a7851f5df4d82f74ab93b501c2044a7d.
- Windows: 40103906560, job 120901506111.
- Chrome: 40103906529, job 120901506350.
- Sites v86, implantação appgdep_6adcc7c899bc8191a9cc1e56775ad4e7, ambiente 14.
- Netlify: primeiro build 6adc9f86b68748c533be48d5 (falhou), preview 6adcc47c2a8abd1cd854f818 (concluído), produção 6adcc87ccc9aa8d4d1471f79 (concluída), rebuild sem cache 6adccdb5520d8ae35c59dd0d (concluído).
- [Evidência sanitizada](evidence/netlify-20261024.json).
- [Netlify: variáveis das Edge Functions](https://docs.netlify.com/build/edge-functions/environment-variables/).
