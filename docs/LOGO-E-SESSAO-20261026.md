# Logo e continuidade de acesso — 26/10/2026

O proprietário relatou que clicar no logo abria o início e removia o login. O print mostra “Entrar” na página inicial. Uma falha concreta foi encontrada: esse link era fixo para todos, sem verificar a sessão; o logo das áreas internas também apontava sempre para `/`. O print, sozinho, não comprova revogação do cookie.

O logo do painel, conta, assinatura e administração agora volta a `/app`, na mesma origem. Início, criador e calculadora consultam o endpoint existente `/api/auth/session`, com credenciais da mesma origem e sem cache. Quando o servidor reconhece a conta, mostram **Meu painel** e o logo volta ao painel. Só uma resposta explícita `user:null` mostra o acesso de visitante.

Falha de rede, resposta inválida ou indisponibilidade mantém um caminho para o painel, sem tratar a incerteza como saída da conta. A verificação retoma ao voltar à aba e não se sobrepõe. Não grava identidade ou senha em localStorage, não altera a chave de sessão, não chama logout e não modifica permissões. As APIs protegidas continuam validando a sessão no servidor.

Testes novos conferem navegação anônima, identificada e indisponível. A rota real de sessão é exercitada com login por e-mail, SQLite/migrações e provedor simulado: verificações sucessivas não removem a sessão nem emitem cookie de saída; uma falha temporária permite recuperar o acesso com o mesmo cookie. O cenário de Chrome percorre logo/painel, início, calculadora, criador, admin e conta, conferindo a mesma identidade e todos os registros de restaurantes.

As falhas da rodada anterior do Chrome também foram tratadas no ensaio: a confirmação de restauração da calculadora agora aguarda a decisão antes de registrar a próxima; a retomada da PWA confere requisição/resposta real de pedidos, sem depender do buffer limitado de Resource Timing. O código operacional dessas duas funções foi preservado.

Resultado final, publicação e links dos ensaios serão registrados após concluir. O leitor de informações por imagem permanece no mesmo conjunto; as campanhas do teste e o pagamento antecipado são a próxima etapa solicitada, separada desta correção.
