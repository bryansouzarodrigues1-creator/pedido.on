# Cartão de acesso após cadastro — integração validada, publicação Sites pendente

Data de fechamento de código: 24/10/2026 (Brasília; commits GitHub em 25/10 UTC).

## Estado confirmado

- PR principal **#111 integrada** à main em `382e30acdaaef0a1e9e8177aac058d20f018340b`.
- Espelho **pizzaria.on-chat PR #64 integrada** em `d11aefe214faddc23a563157c61b29d42d7df927`. Os cinco arquivos funcionais do cartão são byte-a-byte idênticos no projeto principal e no espelho.
- Lovable reportou `ready`, `agentFinished=true` e `latest_commit_sha=d11aefe...`. Isso **não** prova que o backend Sites/Netlify executa essa versão.
- Cliente usa **https://pizzaria-on.netlify.app**, que encaminha APIs ao backend **https://forno-cardapios.waves4845.chatgpt.site**. `/api/hosting` em ambos devolveu `dataReady=true`, com Netlify `viaNetlify=true` e Sites `viaNetlify=false`. Esse endpoint não expõe a versão de implantação.
- **Não afirmar que o cartão já está publicado no site dos clientes.** O deploy do backend Sites com a fonte atual e a verificação final pelo navegador ainda não foram executados nesta sessão.

## Funcionamento

1. Cadastro por e-mail em `/cadastro`: cartão só após a API existente responder `ok:true` e um destino de continuidade. Não há cartão se cadastro falhou ou está inconclusivo.
2. Cadastro no final do criador (`CreatorFinish`): nome do **proprietário** separado do nome da pizzaria; resposta de autenticação confirmada, criação do restaurante e salvamento dos produtos/fotos antes de mostrar cartão; botão **Ir para meu painel** preserva o handoff do rascunho. Usuário que já tinha conta continua direto ao painel, sem novo cartão.
3. PNG e SVG editável gerados exclusivamente no navegador a partir dos arquivos oficiais `/assets/pizza.webp` e `/assets/pedido-symbol.png`. Nome, e-mail, domínio real do host e textos longos; falha explícita se foto/logo não carregarem.
4. Senha oculta por padrão. Inclusão apenas com caixa marcada e alerta de risco; sem envio ou armazenamento adicional do segredo ou da imagem.
5. Tela de acesso indisponível deixa de promover “Testar pedidos com Pix”: prioriza exemplo de cardápio ou retorno ao login. Login não encaminha para recuperação desabilitada.

## Evidências automatizadas

Commit de teste `c99cf1e2e03ae17bc737222f59aa6987016f3937`:

- [Linux/auth/build 40149271131](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40149271131): aprovado, **648 testes passaram**, TypeScript, build e gateway.
- [Windows QA 40149271090](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40149271090): aprovado.
- [Chrome QA 40149271086](https://github.com/bryansouzarodrigues1-creator/pedido.on/actions/runs/40149271086): aprovado. Executou cadastro falso/rejeitado/inconclusivo/confirmado em ambiente isolado, gerou e verificou PNG/SVG com imagens reais dos assets, confirmou sigilo e consentimento para senha e ausência de rolagem lateral móvel/desktop. Exercitou ainda criador, recuperação de rascunho, calculadora, admin, 80 layouts, pedidos e leitura pública sem mutações.
- Os testes públicos de compatibilidade verificam o **site anterior à publicação** separadamente; nenhum cadastro foi criado no Supabase real.

## Pendências para liberar aos usuários

- Publicar **o backend Sites** a partir da main com `382e30ac...` (ou posterior contendo esse commit), preservando D1, R2, Supabase, Netlify e chaves existentes; não criar outra hospedagem ou trocar credenciais.
- Conferir via Netlify em dispositivo real: cadastro novo autorizado, cartão após resposta da API, baixar PNG e SVG, clicar **Ir para meu painel**, verificar loja e produtos; conferir domínio e imagens. Usar conta de teste autorizada e não expor credenciais nem testar Pix real.
- Checar em sessão privada que falha de cadastro nunca gera cartão; repetir em tela estreita. Verificar recuperação de senha por e-mail separadamente.
- **Recuperação de senha permanece desabilitada na produção** (`recoveryEnabled:false` nos dois hosts). O botão de teste de Pix foi removido da interface candidata, mas a recuperação propriamente dita depende da infraestrutura de entrega de e-mail, que não foi ativada.
- A prévia hospedada do Lovable retornou `login_required` para consulta pública nesta verificação; não houve homologação visual diretamente no preview do Lovable. O CI próprio do espelho historicamente falha antes de executar etapas, sem substituí-lo pelos testes do código principal.

Não foram feitas mutações em contas, senhas, banco, pagamento, Pix, gateway, Supabase ou envio de e-mail; não houve consumo de créditos de IA.
