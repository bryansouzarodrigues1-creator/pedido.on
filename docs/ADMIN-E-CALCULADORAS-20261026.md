# Calculadoras e operação — 26/10/2026

## Calculadora pública

O Modo Fácil aparece primeiro para novos cálculos: custo da unidade, margem desejada em linguagem simples, canal e preço sugerido. Despesas ficam em “Ver detalhes”. O resultado informa expressamente quando a sobra ainda é anterior às despesas fixas. O Modo Profissional acrescenta ficha técnica, perdas, embalagem, gás, despesas estimadas, método de preço, taxas e comparação com o preço atual. Trocar de modo não altera os números ou o método já preenchidos. Tabelas antigas com acréscimo abrem no Profissional e conservam a conta antiga.

Ambos usam o mesmo motor em centavos. Na margem real, preço = (custo + reserva de despesas) / (1 − taxas − margem); no acréscimo, soma-se a porcentagem do custo e compensa-se a taxa sobre a venda. A reserva continua sendo porcentagem do custo, como identificado nos campos. Não misturar essa base com porcentagem sobre o faturamento. Custo R$23,80, reserva 15%, taxas 3,5% e margem 30% produzem R$41,16, com sobra estimada R$12,35; os R$48,90 da referência visual não são o resultado desses dados.

Balcão, delivery, iFood e promoção carregam taxas de exemplo explicitamente identificadas e editáveis; não representam contratos do usuário. Salvar, duplicar, CSV, cópia JSON, restauração e projeção mensal continuam gratuitos. “Usar no cardápio” prepara nome/preço por até um dia no mesmo navegador; no painel o dono escolhe o tamanho e confere no editor antes de salvar no rascunho. Não altera um produto ou publica automaticamente.

## Administração e notificações

`/admin/clientes` permite buscar nome, e-mail e pizzaria; inclui contas sem restaurante, contatos registrados, última sessão de login disponível e gerenciamento de acesso já existente. A navegação administrativa prioriza operação e clientes. O cálculo gratuito continua na área do pizzaiolo.

O botão “Solicitar meu cardápio” fica visível na edição do cardápio. O campo aceita o link completo e o atendimento exige autorização/WhatsApp existentes. A entrada pública preserva o link no aparelho até autenticar; a equipe só recebe a solicitação após o envio confirmado no painel.

O sino mostra avisos persistentes por conta. Cadastro e solicitação notificam o administrador configurado; solicitação recebida, início de atendimento, entrega pela extensão/arquivo e bloqueio geram avisos ao dono. A entrega sempre aparece no site; push de cardápio continua condicionado à escolha do dono e à inscrição/permissão do dispositivo. Os avisos administrativos usam texto genérico, sem dados pessoais na tela bloqueada. Marcar lido exige sessão, origem e CSRF; nunca afeta outra conta.

Acessos são medidos a partir desta publicação, por sessão do navegador/página/dia, sem duplicar recargas. Não equivalem a pessoas únicas nem recuperam o histórico anterior. Armazena-se somente hash da sessão, grupo de página e data; não há IP, URL completa ou conteúdo de formulário nos registros. Erros são agregados por área e código fixo, sem mensagens livres, senhas ou documentos. O relatório diferencia registros observados de ausência de dados.

## Continuidade de acesso e custos

As telas de conta acessadas diretamente pelo backend redirecionam antes do login à origem pública configurada. A requisição autenticada e assinada do gateway não redireciona. Isso evita alternar entre cookies de domínios distintos. HTML privado recebe no-store, além das APIs. A renovação espera uma requisição concorrente por até cinco segundos; uma resposta antiga não apaga tokens já renovados por outra requisição. Sessões expiradas/revogadas continuam bloqueadas.

Nenhuma senha antiga fica disponível ao administrador. Alteração autenticada continua exigindo a senha atual; recuperação por e-mail depende da configuração de entrega validada. Não foi criada uma redefinição por mera identificação de aparelho ou uma liberação administrativa sem comprovação do titular.

A nova migração 0020 é aditiva (avisos, acessos e contadores de falhas). Preserva contas, cardápios, pagamentos, sessões e chave de sessão. As rotinas excepcionais de limpeza continuam desarmadas; não executá-las em publicações comuns.

As mudanças do aplicativo são servidas pelo backend atual. Nenhuma fonte do gateway Netlify foi alterada, evitando reconstrução desnecessária. Nos planos Netlify por créditos, uma publicação de produção bem-sucedida custa 15 créditos; prévias não têm essa cobrança. Fonte: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ . Não foi consultada a fatura particular do usuário.

## Verificação

Os testes novos cobrem margem versus acréscimo, restauração de dados legados, transferência com prazo/tamanho explícito, origem canônica, cadastros privados, avisos isolados e deduplicação de visitas. Serviços externos e credenciais dos fixtures são simulados. Não foram enviados e-mails, criadas cobranças, apagadas contas, geradas imagens pagas ou publicados restaurantes de clientes.

Passaram 677 testes da bateria completa, TypeScript, build do aplicativo e preparação/check Netlify. Após a revisão de concorrência e login do diretório, 42 testes das áreas afetadas passaram, incluindo a resposta antiga do provedor durante renovação e o redirecionamento de visitante sem sessão. CI remoto e publicação devem ser conferidos na PR #129. A prévia gerenciada local não ficou saudável nesta sessão; não tratar esse retorno como aprovação visual ou de Android físico.
