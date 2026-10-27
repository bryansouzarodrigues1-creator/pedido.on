# Primeiros passos para quem vai abrir uma pizzaria — 27/10/2026

## Motivo e escopo

O relato de um pizzaiolo iniciando um delivery com a esposa mostrou que ele precisava de um caminho curto para cadastrar, entender custos e publicar. O guia usa o aplicativo e os modelos existentes. As ferramentas completas continuam acessíveis, e nenhuma etapa educativa é exigida para publicar.

## Comportamento

- Pizzaria nova sem produtos abre em **Comece sua pizzaria**, com quatro etapas. Uma importação em revisão conserva seu fluxo atual. Quem já usa o painel encontra **Abrir primeiros passos** em Pedidos e o acesso no menu lateral. A escolha de usar as ferramentas completas é lembrada neste aparelho; reabrir o guia continua disponível.
- **Cadastre suas primeiras pizzas** abre o editor existente, só exige nome e preço de pelo menos um tamanho; foto/descrição ficam opcionais. Guardar e continuar usa o salvamento normal com revisão. O progresso só conta o produto quando salvo na conta.
- **Descubra quanto sobra** mostra uma conta por pizza com dois valores: custo e preço pretendido. Entrega paga pela loja, taxas/impostos e parcela fixa são opcionais e explícitos. R$20 de custo/R$40 de venda deixam R$20 antes dos gastos ausentes; não se apresenta esse valor como lucro líquido garantido. Perdas continuam negativas. A conta não altera preços do cardápio.
- **Configure seu delivery** reúne WhatsApp, horário, entrega/retirada, taxa e prazo. Retirada exige endereço. Guardar usa a mesma API/revisão e não publica. Mudanças nos dados conferidos tornam essa etapa pendente novamente. Horários informativos não abrem/fecham pedidos automaticamente.
- **Publique seu cardápio** oferece quatro modelos existentes, prévia com os produtos reais e foto ilustrativa de capa opcional. Retirar a foto não troca o layout, os produtos ou os preços. A foto padrão é identificada como ilustrativa também no cardápio público. Um modelo visual não substitui textos/contato/Pix do cliente. Publicação continua explícita e usa as regras existentes.
- **Fazer essa etapa depois** avança sem contar conclusão falsa. O progresso de publicação vem do servidor. O estudo de custos/conferências fica neste navegador, por pizzaria, e não é exposto no JSON público do menu. Storage indisponível é informado, sem falsa indicação de persistência.
- A calculadora Fácil também passa a explicar o significado do resultado e os gastos ainda não incluídos. O comparativo de margem/acréscimo e os cálculos existentes são preservados.
- Confirmar um estudo registra apenas uso da calculadora no contador autenticado já existente. Custos e preços não são enviados na medição; identidades fornecidas pelo cliente continuam proibidas.

Tudo é local e pré-preparado: nenhuma chamada de IA, nova chave, migração, compra ou mudança de franquia é necessária para estas orientações. Não foi criado grupo/comunidade nem enviada mensagem a clientes.

## Validação

Seis cenários puros já verificaram aritmética, perdas, limites, progresso real, retomada/isolamento de storage e preservação de dados ao trocar o modelo/foto. A checagem inicial de tipos passou. Um cenário de integração adicional cobre o contador autenticado sem valores financeiros.

O ensaio Chrome novo é restrito ao runner descartável do GitHub e usa as APIs normais de salvar/publicar com D1/R2 locais: pizzaria vazia → produto → custo → retomada → entrega → modelo/foto → publicação. Ele bloqueia modelos externos, pedidos, pagamentos e mensagens, e confere outras lojas preservadas e larguras de 320/412/768/1280 px. Entrará na bateria do kit de boas-vindas; os artefatos guardam os resultados e telas.

Registrar aqui o commit final, a suíte completa e a publicação após sua conclusão. **A versão pública confirmada antes deste ajuste é a v104. O guia ainda não está publicado.** Android físico, e-mail de recuperação real e cobrança externa continuam sem homologação.
