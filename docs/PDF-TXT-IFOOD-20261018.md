# Cardápio por arquivo e entrada simplificada

## Comportamento

- O campo principal recebe ideia, produtos e link do iFood. O botão de link mantém o mesmo campo e o texto já escrito.
- “Enviar PDF, foto ou TXT” abre os anexos; o texto importado fica em uma revisão recolhida, em vez de outro campo de link competindo com a conversa.
- PDF com texto usa PDF.js 5.6.205 no navegador. Cada página vira uma imagem de conferência com texto posicionado. Página escaneada, texto insuficiente ou página rotacionada segue para o OCR local existente.
- PDF: até 15 MB, no máximo oito páginas somadas às fotos atuais. TXT/CSV: até 60 mil caracteres; aceita UTF-8 e Windows-1252. A leitura rejeita PDF inválido, protegido por senha ou que ultrapasse o limite, mantendo os anexos anteriores.
- Nome, endereço, WhatsApp e horários explicitamente rotulados em PDF/TXT podem preencher as perguntas faltantes. Os dados já informados ou adiados pelo dono permanecem.
- Página HTML salva: até 1,5 MB. Dados estruturados do catálogo são reaproveitados, com confirmação de metadados da loja quando há um endereço canônico iFood único. Sem eles, o leitor usa texto visível. Scripts e recursos externos da página não são executados/carregados.
- Os arquivos são processados no aparelho; o servidor não recebe os PDFs nesta etapa. O worker, as fontes e o suporte PDF ficam na origem do próprio aplicativo, preparados pelo build.
- A prévia tem altura limitada, texto maior e não cria pôsteres vazios para produtos sem foto. O cardápio completo continua disponível para testar o carrinho sem pedido real.
- Nomes comerciais e endereços não viram instruções de cor. A mensagem original permanece salva no estado da conversa.
- O cadastro usa somente um campo de senha, mantendo 12–128 caracteres, mostrar/ocultar, CSRF e validação no servidor. Recuperação de senha mantém sua confirmação própria.

## iFood real e alternativa disponível

A consulta anônima da loja Aione Pizzas continuou retornando HTTP 403 em 18/10/2026, inclusive numa consulta independente pela ferramenta TinyFish. Não houve catálogo real positivo nesta rodada.

O aplicativo oferece abrir a loja e enviar PDF, prints, texto ou HTML salvo. No computador, expandir categorias e usar Imprimir → Salvar como PDF pode trazer o conteúdo já acessível ao dono. A impressão só contém o que a página renderizar; catálogo virtualizado/incompleto exige outras páginas/prints. Não anunciar sincronização contínua, conector oficial ou catálogo completo por qualquer link.

A integração oficial Catalog API requer um aplicativo iFood e autorização do estabelecimento. Nenhuma credencial desse conector está configurada nesta tarefa. Não usar endpoints privados nem contornar bloqueios.

## Verificação

Os documentos de QA são inteiramente fictícios e estão codificados em `scripts/fixtures/menu-documents.json`. Incluem PDF de duas páginas com quatro produtos e preços conhecidos, PDF escaneado de bebidas e PDF protegido por senha. Testes de HTML usam página controlada; cadastro no Chrome usa resposta simulada. A leitura PDF/OCR executa as bibliotecas reais.

Os identificadores finais de CI, fonte Sites e implantação serão registrados após a validação. Android é emulado no Chrome; não há dispositivo físico conectado. Nenhuma geração paga, cobrança ou migração de banco faz parte desta mudança.
