# Painel para contas existentes — 18/10/2026

O dono abriu o endereço Sites, enquanto as melhorias anteriores estavam somente no beta Cloudflare. Esta alteração reúne o código verificado no histórico existente do Sites, preservando projeto, audiência, autenticação, banco e arquivos.

- Navegação principal: Pedidos, Cardápio e Pizzaria.
- Cardápio reúne Produtos, Aparência e Ofertas. Contas existentes não precisam recriar a pizzaria.
- Conta sem produtos e ainda não publicada entra em Produtos. O painel não repete o assistente de criação, nem mostra cartões grandes de vendas zeradas antes da publicação.
- Ver online abre a publicação efetiva. Ver prévia permanece visível também no celular quando o cardápio não está publicado.
- Aparência usa os produtos e dados atuais na prévia completa. Os doze modelos são uma alternativa recolhida, aguardando seleção e aplicação explícitas. Logo, capa e cor ficam no mesmo destino; contato, entrega e pagamentos permanecem em Pizzaria.
- Trazer do iFood tem entrada e campo de link próprios. A leitura guardada continua acessível sem esconder as fontes de importação.
- Foi reaproveitado e revisado o parser de dados públicos da PR #25: JSON-LD e __NEXT_DATA__, disponibilidade, opções complexas, valores inequívocos e limites. Nenhuma API privada, credencial iFood ou contorno de bloqueio foi adicionado.

O catálogo completo não é garantido por um link público: bloqueios ou páginas sem produtos continuam exigindo texto, arquivo ou prints. O conector oficial requer aplicação autorizada e acesso da loja. Não afirmar homologação externa de importação automática.

Validação local: a suíte anterior de 399 testes passou após a reorganização inicial; dois testes SSR cobrem registros legados vazios e publicados. Os testes de segurança do parser e preservação de leitura passaram. A rodada final e o CI com Chrome/Pixel 7 emulado são registrados na PR. O teste do iFood no navegador usa respostas controladas, nunca um catálogo externo ficticiamente atribuído a uma loja real. Android físico permanece distinto.

Nenhuma criação de conta real adicional, geração paga ou cobrança faz parte desta alteração. Dados comerciais e publicação dos cardápios dos donos não foram alterados.
