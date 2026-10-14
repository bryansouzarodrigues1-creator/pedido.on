# Primeiro acesso com IA e administração comercial

## Decisões de produto — 13/10/2026

### IA como primeiro passo
Cadastro direto existente é preservado. Na primeira criação da pizzaria, o dono informa apenas nome, WhatsApp, link e uma descrição opcional da identidade desejada. A descrição preenche a conversa do Estúdio e a primeira tela pós-criação passa a ser **Criar com IA** (modo visual/texto), com link destacado para **Enviar fotos do cardápio**.

**O modelo não é chamado automaticamente.** O dono toca em Criar prévia, confere os textos/cores, decide aplicar ao rascunho e publica apenas quando quiser. Se o modelo estiver fora do ar, o restante continua funcionando.

Leitura de cardápio utiliza OCR local já publicado: até 8 fotos por lote, múltiplos lotes quando necessário, preços sempre revisados, componentes de compra existentes reaproveitados. O texto do estúdio trabalha sobre os produtos confirmados, não inventa valores e não cria produtos automaticamente. Manter cadastro manual.

### Sobre as 30 fotos
'30 fotos' pode significar (a) até 30 fotos **enviadas para ler o cardápio** ou (b) 30 fotos **geradas por IA para produtos**. São funções distintas.

- OCR: não requer chamadas pagas; mantenha lotes pequenos para Android, com retomada, armazenamento local e inclusão incremental. Não aumentar 8 fotos simultâneas para 30 sem medir memória, tempo e bateria.
- Geração: 30 fotos profissionais produzidas por IA são **30 gerações pagas**, frequentemente com erros/refações. O limite atual real continua **3 imagens/proprietário/mês e 2/dia no total**; não aumentar sem aprovação de orçamento, medição de custo e fila/cotas por conta. Na prévia, usar imagens do proprietário já enviadas; não inventar fotografias como produtos reais.
- Planejar um orçamento fechado e uma fila de até 30 produtos elegíveis, executar geração somente sob escolha explícita do dono, preservando fotos já existentes. Agrupar variações em um painel é uma tarefa futura; não lançar automaticamente imagens em massa no cadastro.

### Admin do SaaS, inspirado no JurisAuto
Um único controle **Gerenciar plano e acesso** no cartão da pizzaria, aplicável a todas as lojas da conta:
- Padrão: restaurar trial/assinatura normal.
- Cortesia: Essencial/Profissional (Pro)/Rede por 7/30/90 dias ou até revogação.
- Suspenso: interromper novos pedidos e publicação comercial, sem apagar histórico, nem alterar ou cancelar cobranças anteriores.

Toda mudança requer motivo, versão anterior, acesso da conta administradora e cookie CSRF; auditoria persistida. Evitar interfaces separadas para "ativar", "desbloquear" ou "condição especial" que realizam a mesma ação.

**A cortesia não equivale a pagamento confirmado**, não altera assinaturas ou webhooks. Com a cobrança desativada, a suspensão continua bloqueando menu/pedidos, enquanto a cortesia já está registrada para funcionar quando o sistema comercial for ativado. Acesso de leitura ao histórico e recuperação do usuário continuam possíveis. O admin não pode bloquear a própria conta. O desconto financeiro ou condições de cobrança específicas dependerão do Asaas, que ainda está separado na PR #1.

Exclusão/arquivamento de contas pagantes exige desenho separado: nunca apagar transações nem trilhas financeiras. Não misturar exclusão com suspensão.

### Publicação
Branch isolada. Rodar CI, testes de acesso/auditoria/race e testes móveis. Aplicar migração aditiva 0012 **somente depois do backup** e sem interferir em alterações do Work; publicar pelo fluxo Sites que não se sincroniza automaticamente com o GitHub. Testar concessão Pro, suspensão e retorno ao padrão entre duas contas, sem usar dados de clientes. NÃO declarar publicado antes do deploy real.
