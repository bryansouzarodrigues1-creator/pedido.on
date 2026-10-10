# Serviço de imagens

Fonte completa em `services/image-service/`, exportada do projeto Lovable `c1919edd-8b5e-40f8-b646-9ccd9c69e01f` no commit `4578d1cc508cfc850946fcf882bab3032288ab18`. É um aplicativo TanStack Start separado, com servidor e página informativa.

## Configuração

No aplicativo principal:

```dotenv
PEDIDO_IMAGE_ENABLED=false
PEDIDO_IMAGE_ENDPOINT=https://pedido-on-imagens.lovable.app/api/pedido-on/image
```

Um clone novo começa desligado. A publicação existente possui ativação própria no ambiente da hospedagem. Para ativar em outro ambiente, primeiro valide o serviço e a URL de retorno; depois altere a variável. Não configure `LOVABLE_API_KEY` no aplicativo principal. A chave gerenciada pertence exclusivamente ao servidor do serviço.

O modelo fixado no código é `google/gemini-3.1-flash-lite-image`. O gateway é `https://ai.gateway.lovable.dev/v1/images/generations`. A origem da confirmação de uso fica fixada em `CLAIM_URL`, no arquivo `src/lib/pedido-image.server.ts`; atualizar o domínio principal exige atualizar esse endereço e republicar o serviço.

## Protocolo `pedido-image-v1`

1. O dono autenticado pede uma imagem em `/api/restaurants/<id>/ai/images`. O servidor confirma que a loja pertence a ele e valida o briefing.
2. O servidor reserva a tentativa em D1. Cria um UUID de tarefa e um token aleatório; persiste somente o hash do token. O ID da solicitação protege contra duplicação de uma mesma tentativa.
3. O servidor chama o serviço de imagens com apenas `{jobId, token}`. O navegador não envia chaves, modelo, URL de retorno ou prompt diretamente ao gateway.
4. O serviço resgata o briefing em `/api/ai/images/claim` do aplicativo principal. A confirmação é atômica, expira em dois minutos e funciona uma vez. Um token inválido não chama o modelo.
5. O serviço chama o modelo fixo e devolve bytes PNG, JPEG ou WebP, de até 5 MB. O aplicativo verifica o formato, salva no R2 e registra o resultado.
6. O dono revisa o resultado e aplica à loja. A imagem só é publicada depois de salvar/publicar o cardápio.

## Limites atuais do protótipo

- **3 tentativas por proprietário por mês**, somando suas lojas.
- **2 tentativas por dia para toda a plataforma**.
- Limite adicional de 10 novas requisições por proprietário/dia.
- Contagem de dias e meses em UTC. As cotas de imagens são independentes dos créditos de importação OpenAI e dos planos Stripe.
- Uma falha anterior ao resgate do token devolve a tentativa. Uma resposta explícita `402` de falta de saldo também devolve a tentativa.
- Um timeout ou erro após resgatar o token mantém a contagem, porque a geração pode ter consumido saldo. Reconsultar o mesmo ID não cria outra geração.

Esses limites contêm o uso; não são um preço por imagem nem uma garantia de custo. Ainda falta uma geração real autorizada e a conferência do consumo no painel. Não comprar créditos, aumentar limites nem chamar o modelo real sem autorização do proprietário.

## Verificações sem geração paga

`GET /api/pedido-on/image` informa `configured`, `model` e `protocol`, sem chamar o gateway. Os testes de `src/lib/pedido-image.test.ts` usam mocks para confirmar limite de corpo, autorização, formato de imagem, respostas do provedor e rejeição antes de gerar.

Na pasta do serviço, com Bun instalado:

```sh
bun install --frozen-lockfile
bun run test
bunx tsc --noEmit
bun run build
```

O `bun.lock`, a configuração Vite/TanStack e as instruções `AGENTS.md` foram preservados. Exportar a chave gerenciada não faz parte do código; hospedar fora da Lovable exige confirmar a disponibilidade do gateway e das credenciais nesse ambiente antes de prometer geração funcional.
