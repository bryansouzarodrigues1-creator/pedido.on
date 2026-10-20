# Coletor iFood: integração do servidor preparada — 20/10/2026

**O catálogo real ainda não foi obtido.** Os três ensaios externos anteriores retornaram zero produtos. Esta continuação implementa a ponte do servidor e a revisão, com transporte simulado; não repete esses ensaios nem ativa o coletor em produção. A conexão Apify do chat não disponibiliza sua credencial para os visitantes do site.

## Comportamento implementado

`POST /api/menu-source` mantém a leitura pública atual. Somente quando há configuração explícita, validação do coletor e token do servidor, pode consultar o Actor fixo `viralanalyzer/ifood-restaurant-intelligence` (`Dd5SpXWfkz2yqNAuf`) após a página pública não fornecer produtos.

Um processo `SUCCEEDED`, nome extraído do endereço ou catálogo vazio não contam como importação. A resposta precisa conter uma única loja com URL canônica correspondente, catálogo `captured`, moeda BRL e contagens coerentes. A ponte aceita preços decimais em reais conforme a documentação, preserva descrições e exige que os produtos atravessem o leitor existente sem alteração do nome/preço. Valores divergentes, opções complexas, promoções conflitantes e itens indisponíveis são descartados. Os limites não escondem conflitos que apareçam no fim do resultado.

O texto reserva espaço para a URL, contém no máximo 200 produtos e nunca corta um produto pela metade. A busca parcial não é anunciada como catálogo completo. A mensagem de cobertura aparece na conversa. Pizzas sem tamanho explícito ficam para revisão; a prévia explica por que um item pendente ainda não aparece e conserva esse aviso ao reabrir o projeto. Nenhum produto é escrito no cadastro pela consulta.

O Actor não fornece aqui uma prova de endereço, horários ou WhatsApp. Esses campos não são preenchidos por nomes de URL ou metadados desse coletor. Dados estruturados verificáveis já encontrados pela leitura pública seguem o fluxo anterior de confirmação. Imagens e avaliações não são solicitadas nem baixadas.

## Limites e autenticação

| Controle | Valor fixo |
| --- | --- |
| Loja por execução | 1, somente a URL enviada |
| Produtos solicitados/devolvidos | Até 200 |
| Tempo do Actor / espera do servidor | 60 s / 65 s |
| Resposta JSON | Até 1.500.000 bytes, incluindo stream sem Content-Length |
| Parâmetro de cobrança da API | `maxTotalChargeUsd=0.05` |
| Reservas D1 por loja | 1 por janela fixa de 10 minutos, pelo UUID |
| Reservas D1 da plataforma | 5 por janela de 24h e 20 por janela de 30 dias |
| Cache positivo | 15 minutos, por URL canônica; pode variar entre regiões |
| Nova tentativa automática / reinício em erro | Desativados |
| Proxies / imagens / avaliações | Desativados |

As janelas de D1 são fixas, alinhadas ao epoch, não meses civis nem intervalos móveis. As reservas são atômicas e não são devolvidas em falha/desconexão: uma chamada síncrona pode terminar no provedor mesmo após perdermos a resposta. Consultas repetidas e aliases da mesma loja não iniciam nova execução dentro da janela; cache de sucesso evita a chamada. Cache indisponível não perde o resultado. Falha ou vazio nunca entra no cache positivo. O navegador sempre recebe `private, no-store`.

O token vai somente em `Authorization: Bearer` para `api.apify.com`, com redirecionamento manual. Não vai na URL, navegador, cache, mensagens de erro ou Git. Cookies/CSRF do visitante não são encaminhados ao provedor. Nenhum token da conexão do chat foi copiado. Não há migração de banco; usa a tabela `rate_buckets` existente e Cache API do Worker.

**Custo:** a loja do Actor documenta US$0,025 por restaurante em eventos PPE e avisa que compute/memória, tráfego e armazenamento da plataforma podem ser cobrados separadamente. O limite enviado à API e as reservas são proteções de execução; não substituem conferir os limites/faturamento da conta Apify e não provam custo zero em falhas. Nenhuma nova execução de Actor externo ou contratação foi feita nesta continuação.

## Ativação pendente

Não basta conectar Apify ao chat. Antes de ativar:

1. Obter um resultado real com produtos e preços da loja e conferir seu dataset com o proprietário. Os testes anteriores com zero produtos não satisfazem esta etapa. Não insistir em contornar bloqueios.
2. Conferir o contrato da versão do Actor, permissões da conta e condições de uso/custo. Se o formato mudar, adaptar e repetir os testes controlados antes da ativação.
3. Configurar `APIFY_TOKEN` como segredo do ambiente de hospedagem do site. Usar o painel de segredos; nunca colar o token no chat, no código ou no Git. O token não é o segredo Asaas nem a chave interna de sessão.
4. Somente após essa validação, definir `PEDIDO_APIFY_IFOOD_VERIFIED=true` e `PEDIDO_APIFY_IFOOD_ENABLED=true`. A ausência de qualquer flag ou token mantém a integração desligada.
5. Em uma ativação autorizada, conferir uma loja e sua revisão completa, reutilização do cache e contabilização na conta. Em falha, desligar a flag e continuar por PDF/TXT/CSV/foto; não disparar tentativas sucessivas.

Nesta entrega, as flags e o token estão ausentes do ambiente de produção, que permanece na revisão 13; portanto **o coletor segue desligado**. O conector oficial iFood também não foi ativado, nem foi exigido CNPJ para continuar por arquivo.

## Testes e publicação

Passaram 499 testes (17 novos) e TypeScript na candidata final. A verificação final, build, CI Chrome/Windows, publicação e comparação dos sete cadastros serão registrados após a conclusão.

Os cenários novos usam a fictícia **Forno Azul de Teste**: Calabresa R$49,90, água R$5,50 e guaraná R$11,50. Cobrem sucesso/partial, vazio/bloqueio, outra loja, moeda/contagem inválida, centavos, preços conflitantes/adicionais, limite de texto, cancelamento/erro/redirect/stream grande, segredo e cabeçalhos, cache/TTL, concorrência e cotas em workerd com D1 real local. O QA Chrome adicional usa a mesma resposta simulada normalizada e armazenamento local do navegador: não é uma importação externa real, nem Android físico. OCR de fotos permanece na medição anterior 13/21; nenhuma melhora geral foi medida aqui.

Fontes primárias consultadas em 20/10/2026: [README/contrato/preço do Actor](https://apify.com/viralanalyzer/ifood-restaurant-intelligence), [API de execução síncrona e limites](https://docs.apify.com/api/v2/actor-run-sync-get-dataset-items-post). Resultados externos anteriores: [PDF/Apify v69](PDF-APIFY-20261020.md).
