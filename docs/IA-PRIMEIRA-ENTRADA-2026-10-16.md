# Parte 1 — Entrada IA-first sem cadastro (16/10/2026)

## Fluxo entregue na candidata

1. Do site ou rodapé do cardápio publicado/demonstração, abrir `/criar`. A tela inicial apresenta o prompt e entrada para fotos do cardápio, TXT/CSV ou link iFood sem exigir login.
2. Criar opções mostra **quatro prévias reais** do mesmo componente de menu que é publicado. Há **oito estilos-base** em duas rodadas de quatro. Os blocos mudam composição de produto (cartões, lista, compacto, fotos maiores), capa, tipografia, cantos e cores; não são imagens estáticas de um app inexistente.
3. Trocar a rodada não exige IA; ajustes escritos livremente são analisados por regras locais e podem trocar composição, cores, tipografia e texto explícito de slogan. Não há frases de resposta predefinidas e não se fazem chamadas Lovable de convidados.
4. Escolher modelo mostra uma prévia maior. O usuário pode ajustar novamente ou continuar. Se o nome da pizzaria não foi reconhecido, a galeria oferece **um único campo opcional** e a conta utiliza esse valor sem pedi-lo de novo. A escolha `styleId`, o briefing, o nome, a intenção de IA e o refinamento (limites 1600+600) ficam num checkpoint local validado, com validade de sete dias.
5. O checkpoint de importação/fotos do cardápio continua no IndexedDB. Após login/cadastro, o formulário pode reutilizar o nome da pizzaria presente no primeiro briefing (mudança originada da PR #24); o servidor recebe `styleId` do enum e `refinement` separado, cria a loja com o design escolhido, **sem publicar**, e mantém Pix/valores intocados. Anexos são conferidos no leitor antes de afetar o rascunho.
6. O cadastro segue os meios de autenticação já existentes. Email/senha disponível; Google depende do estado do provedor OAuth no Supabase e não é habilitado por este pacote.

## Segurança e custo

- Nenhuma imagem/texto é gerado por modelo pago na etapa pública, para impedir abuso de gerações sem conta. As prévias são renderizadas pelo produto e refinadas por regras. **Nunca chamar isso de geração generativa livre.** Existe um caminho explícito para quem não gostou de nenhum dos oito modelos: escolher o pedido de design exclusivo e continuar para o Estúdio de IA **depois da conta**, mantendo o briefing livre e sem consumir cotas sem autorização. O Estúdio continuará condicionado às franquias da conta.
- A string de briefing não aparece na URL; session/token não são colocados no prompt. O backend valida os oito IDs e rejeita atributos financeiros extras do schema.
- Fotos de cardápio são lidas pelo OCR já existente. Logo e capa são recebidos **separadamente**, com validação de formato/até 2 MB, e guardados em IndexedDB por sessão. A escolha altera a prévia, mas nunca cria produto por OCR. Após criar a conta, os arquivos são transferidos para a nova pizzaria no mesmo aparelho e podem ser **aplicados explicitamente** em Pizzaria → Arquivos trazidos na criação. O upload vai à mídia da própria loja, a alteração entra no rascunho e não publica automaticamente.
- Não confundir com a melhoria ainda pendente do leitor iFood na PR #25 nem com a integração oficial, que requer homologação.

## Dependências e pronto

- PR #24 é ancestral da PR #26; reconciliar/mesclar #24 primeiro para obter diff limpo.
- Testes de segurança, persistência, oito opções, refinamento, rota e criação pelo D1 fixture estão no `scripts/check-gallery-first.test.mjs` e no CI.
- **Ainda precisa:** verificar visualmente e interagir em Android no navegador real; testar retorno de sessão com IndexedDB bloqueado, teclado virtual e tela pequena; validar login Google em provedor real, se habilitado; publicar no Sites e confirmar a versão retornada. GitHub não publica o domínio automaticamente.
- Não consumir créditos Lovable, ativar API paga anônima, chamar OAuth não homologado, migrar banco ou mudar trial/billing nesta parte.
