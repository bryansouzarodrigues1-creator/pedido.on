# IA do pedido.on: configuração atual

A IA está habilitada no aplicativo publicado v17. Serviço: https://pedido-on-estudio.lovable.app, projeto `aa27093c-2768-41f2-8274-923fdfe2b5ff`, workspace Pro `workspace_01kn20zmepfahsq3q7xa36ct6h`. O serviço antigo foi preservado; produção usa o novo.

## Ambiente do aplicativo

```text
PEDIDO_STUDIO_ENABLED=true
PEDIDO_STUDIO_ENDPOINT=https://pedido-on-estudio.lovable.app/api/pedido-on/studio
PEDIDO_IMAGE_ENABLED=true
PEDIDO_IMAGE_ENDPOINT=https://pedido-on-estudio.lovable.app/api/pedido-on/image
```

São configurações públicas. `LOVABLE_API_KEY` fica gerenciada somente no servidor Lovable. Sites/D1/R2/Supabase não precisam de migração para ativar o gateway. Mudança de variável Sites exige publicação com a revisão nova do ambiente.

## Correção da falha

`redirect: "error"` causava exceção no Worker antes da chamada. `lib/ai-provider.ts` usa `manual`, com respostas 3xx rejeitadas sem encaminhar tokens. A correção foi reproduzida e testada em workerd.

`/api/platform?check=ai` consulta saúde dos dois endpoints sem chamar modelos. Tem limite de frequência, não devolve chaves e não gera conteúdo. Em v17 retornou `enabled:true, connected:true` nos dois canais. Isso verifica conexão/configuração; não substitui geração completa na conta da loja.

## Modelos e custos

| Canal | Modelo | Endpoint do gateway |
| --- | --- | --- |
| Texto | `google/gemini-3.1-flash-lite` | `/v1/chat/completions` |
| Imagem | `google/gemini-3.1-flash-lite-image` | `/v1/images/generations` |

Texto tem saída limitada a 1800 tokens; imagem produz uma por pedido. Modelos fixos no serviço. Cotas preservadas: texto 20/proprietário/mês e 20/dia na plataforma; imagem 3/proprietário/mês e 2/dia na plataforma.

Run credits são separados de construção. Nova geração usa saldo; consulta do mesmo pedido reutiliza resultado. Erros anteriores ao claim ou saldo explicitamente recusado devolvem reserva. Após claim, falhas ambíguas ficam contadas, evitando novas chamadas pagas automáticas.

## Validação de 11/10/2026

A chave gerenciada e os modelos foram aceitos. Um texto real retornou 200/JSON/577 bytes; uma imagem real retornou 200/JPEG/179.881 bytes. Os handlers foram usados com claim simulado localmente, sem bypass público. Não houve erro de saldo/modelo. Passaram 7 testes de protocolo e 14 existentes, typecheck e build.

A investigação e a conferência final consumiram 4,0 créditos de construção, sem Max ou compra de saldo. As duas chamadas reais têm consumo separado, não informado pelo plugin. O ciclo completo com loja autenticada e a revisão no celular permanecem pendentes.

## Manutenção

Arquivos de servidor, rotas e testes em `services/image-service` foram sincronizados com o commit ativo `81b09ac97be1ddfa62ec5ff60fb63fe6094a5221`. Nunca conectar a raiz inteira do monorepositório à Lovable ou expor a chave ao aplicativo/navegador.

Primeiro investigar logs do Worker e saúde. Não pedir imagens repetidas para testar conexão, aumentar cotas ou comprar saldo sem instrução do proprietário. Ver também `STUDIO.md` e `docs/IMAGENS.md`.
