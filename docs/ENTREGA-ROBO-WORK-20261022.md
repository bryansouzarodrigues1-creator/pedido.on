# Entrega do robô pela administração — v82

Publicado em **22/10/2026 às 13:54 de Brasília** pelo Work, usando os plugins GitHub e Sites. O runner pode executar no GitHub Actions sem o PC do proprietário. O administrador agora entrega o arquivo de captura à solicitação correta; o dono recebe os itens para conferir no importador existente.

## Uso publicado

1. O dono abre uma solicitação de assistência com o link e as autorizações da loja.
2. O operador executa **Actions → iFood capture runner (review only)** no repositório principal, com o link autorizado. Cada tentativa termina ao encontrar bloqueio.
3. Havendo produtos exportáveis, salva `resultado-importacao.json`, disponível no resultado/artefato da tentativa e no resumo do workflow.
4. Em [Administração → Importações](https://forno-cardapios.waves4845.chatgpt.site/admin/importacoes), abre a solicitação ativa e **Enviar resultado do robô**, seleciona o arquivo, confere a prévia, confirma e envia.
5. O dono abre a revisão, confere preços, pendências, tamanhos e fotos e decide quais itens aplicar. A publicação continua explícita.

O recebimento não altera rascunho, identidade da pizzaria nem cardápio público. O painel administrativo existe no endereço Sites acima; o frontend público Lovable permanece em `https://pizzaria-on-estilos.lovable.app` e usa o backend existente. O frontend raiz Lovable não mudou nesta entrega.

## Validação e concorrência

- `lib/menu-runner-result.ts` valida o envelope `pizzaria-on-capture-review-v1`, sucesso HTTP, estado da captura, identidade iFood, contagens, IDs/categorias e limites de 200 itens/650.000 bytes.
- `POST /api/admin/menu-import-results` exige administrador, origem, CSRF, limite de uso, confirmação e loja correspondente. Só recebe solicitações ativas. A transição atômica evita sobrescrever cancelamento, entrega anterior ou captura da extensão e invalida o pareamento.
- Capturas bloqueadas, vazias ou indisponíveis são recusadas, mesmo quando contêm produtos antigos. Preços ambíguos, indisponíveis e tamanhos continuam pendentes.
- O arquivo não fornece autorização para ler mídias privadas. Fotos só reutilizam uploads concluídos da mesma solicitação e com item/origem correspondentes. Fotos em andamento e URLs privadas recebidas no arquivo não são associadas.
- Notificação usa somente a autorização já registrada pelo dono e o mecanismo existente. Não houve mensagem ou notificação real nesta verificação.

Nenhuma migração, troca de credencial, alteração de ambiente ou contratação. Supabase Auth, D1/R2 e ambiente revisão 13 preservados. Comparação completa das sete linhas de restaurantes antes/depois: todos os campos iguais. Nenhum dado pessoal foi incluído nas evidências.

## Provas da candidata integrada

| Verificação | Resultado |
| --- | --- |
| Testes Node | 584 aprovados, sem falhas ou skips |
| TypeScript e build/empacotamento | Aprovados |
| Windows | [39815698686](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39815698686), aprovado |
| Chrome e assistência | [39815698715](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39815698715), aprovado; seis cenários de assistência, zero erros |
| Captura sintética Chrome | [39815698681](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39815698681), aprovado |
| Espelho CI/build e captura | [39815929799](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/39815929799) e [39815930106](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/actions/runs/39815930106), aprovados |
| Arquivo grande adicional | 415.276 bytes, 200 produtos recebidos e disponíveis ao dono, HTTP 200; workerd/D1/R2 descartáveis |
| Preservação de produção | Sete restaurantes, comparação completa de todos os campos, nenhuma mudança |

O Chrome percorreu arquivo de outra loja recusado, seleção correta, prévia, confirmação do administrador e revisão do dono sem modificar rascunho/publicação. Capturas móveis do administrador e do dono foram inspecionadas. Pixel 7 emulado, sem Android físico. Artefato Chrome `12441688090`: ZIP baixado, SHA-256 `fd07a61377abd5bb08cdafc4c6dc935dc3f018f29e39f5c43be8b44bac59b52f` e CRC conferidos. Os dados dos cenários são sintéticos; identidade externa e notificações são simuladas.

## Fonte e publicação

| Referência | Valor |
| --- | --- |
| PR principal integrada | [#89](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/89) |
| Head principal testado | `b970c4766caa4a6eedfb856bb73da18afd7c646e` |
| Merge principal | `a28b7c34bdb20c31c4e4b03dbb4a50211f73822f` |
| Espelho integrado | [#44](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/44), merge `f5464983e5451e5fd172d10653b231205832510c` |
| Fonte Sites | `fcac6110b3d152768347e82aa46a2709051180b3` |
| Árvore idêntica ao principal testado | `695df1114ee2b788e663d11e049ddb868984329b` |
| Versão publicada | 82, `appgprj_6ac6d3ea9f7881918f315a156338ed52~appgver_88d4f6398d248191a74afcae065ecc39` |
| Implantação | `appgdep_6ada3f8ffec08191a7fa738d1cef6b6d`, `succeeded` |
| Término | `2026-10-22T16:54:03.245482+00:00`, 13:54 de Brasília |
| Ambiente | Revisão 13, audiência pública |

Este registro documental posterior não altera o código da versão 82. A cópia do backend está em `legacy/pizzaria-on-source/` no espelho. Não reconstruir o frontend Lovable nem publicar outra versão apenas para estes documentos.

## Limites reais e próxima continuidade

A consulta remota à Master Pizzas em **22/10 às 13:24 de Brasília** retornou **HTTP 403, zero produtos, zero itens exportáveis**. Foi a tentativa 2 da execução [39698042443](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/39698042443), job `119946333864`, reutilizando fonte antiga `12257424661cfa1cf88e6fbf4650fe9c1e1afede`. O workflow terminou com sucesso por registrar o bloqueio; isso não representa uma captura bem-sucedida nem teste real do novo recebimento.

A integração nova foi validada com capturas sintéticas. Falta um catálogo real acessível e autorizado para validar de ponta a ponta. Não contornar bloqueio com CAPTCHA, perfis, proxies ou trocas de identidade. Não repetir tentativas para desbloquear. PDF/fotos e revisão manual permanecem disponíveis.

A entrega está publicada; o disparo automático do runner a partir da solicitação ainda não existe. Operador executa o workflow e envia o arquivo. Não anunciar importação automática real homologada nem importação automática de fotos. O telefone oficial do suporte ainda precisa ser informado; números sintéticos dos testes não servem como contato público.

Preservar plano único R$49/mês, 252 estilos, prévia sem cadastro e contas existentes. Nenhuma geração Lovable/IA, chamada Apify paga, compra de infraestrutura, cobrança real ou aumento de limites nesta continuação. GitHub Actions usou o mecanismo existente da conta. [Evidência sanitizada](evidence/runner-delivery-work-20261022.json).
