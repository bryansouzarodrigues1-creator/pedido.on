# Recuperação por titular — política de segurança (25/10/2026)

## Objetivo

O proprietário controla a redefinição da própria senha. Administradores **não visualizam senhas antigas, não escolhem senhas dos clientes e não recebem uma senha temporária**. O painel não deve oferecer atalhos para gerenciar credenciais de terceiros. O fluxo de recuperação WhatsApp já existe somente como contato de suporte; NÃO é autenticação.

## Situação atual

- `/conta` permite atualizar a senha apenas para uma sessão válida, exigindo também a senha atual, conforme `changePassword()` no backend.
- `/esqueci-senha` tem canal de WhatsApp quando `PEDIDO_SUPPORT_WHATSAPP` está configurado; isso abre uma conversa, **não** autentica o visitante.
- A recuperação por e-mail continua controlada por `PEDIDO_EMAIL_DELIVERY_READY`; não habilitar sem entrega SMTP real.
- Cartão de cadastro permite opt-in explícito para incluir a senha na imagem, **desligado por padrão**. Essa imagem não serve como prova de propriedade da conta, pois pode ser roubada, reenviada ou sincronizada na nuvem.
- Administrador já não lê ou redefine senhas pelo site. Esta mudança remove do painel um atalho desnecessário ao painel de usuários do provedor; o acesso ao Supabase permanece protegido separadamente.

## Fluxo proposto (não implementado nesta PR)

**No dispositivo habitual:** oferecer `Trocar minha senha` com sessão **ainda válida** e prova de presença mediante credencial criptográfica vinculada a uma chave de acesso/passkey (WebAuthn) **previamente cadastrada** pelo proprietário após reautenticação com a senha atual. Uma sessão no navegador, identificador do aparelho, IP, cookie legado, arquivo de imagem ou `localStorage` por si só não bastam para redefinição sem senha. Nunca pedir e-mail ao cliente já autenticado apenas para localizar a conta.

**Em outro dispositivo:** pedido de recuperação inicia na própria sessão do navegador solicitante com desafio aleatório; o servidor guarda apenas hash do segredo de posse da solicitação, identidade opaca, prazo curto e estado. A administração consulta um pedido concreto, confirma a identidade **por fator independente previamente verificado** (por exemplo, código enviado ao WhatsApp/telefone confirmado previamente em cadastro e não editável durante recuperação), e aprova **apenas aquele pedido**. A aprovação **não** permite ao administrador ver/escolher/receber a nova senha, e não pode migrar sessão do titular para o admin. O cliente volta ao navegador solicitante, prova posse do desafio e verificação adicional, e escolhe a nova senha no campo de sua tela. Invalidar token de uso único imediatamente, revogar sessões da aplicação e, quando tecnicamente possível, sessões do provedor. Emitir log de aprovação e execução **sem segredos**.

### Travas antes de desenvolver/ativar

1. Admin requer MFA/passkey com verificação recente para operações sensíveis; não basta login existente. Caso admin seja comprometido, a aprovação isolada não pode tomar uma conta sem o segundo fator que apenas o titular possua.
2. Registrar e verificar o canal de contato do dono. O telefone fornecido livremente no chat, dados da pizzaria ou uma foto do cartão NÃO são garantia suficiente.
3. Confirmar Supabase Auth e sessão/gateway Netlify/Sites, política anti-CSRF, limitações por IP e conta, auditoria e TTL de poucos minutos.
4. Nunca guardar senha ou enviar senha em texto para WhatsApp, admin, logs, imagens da equipe ou analytics. Interface admin somente `Aprovar recuperação verificada` e `Recusar`, sem campo de senha.
5. Testes reais isolados: sessão inexistente/roubada, dispositivo diferente, reutilização de token, admin com sessão comprometida sem step-up MFA, concorrência de aprovação, reset completo pelo titular, invalidar sessões antigas, prevenir enumeração, modo sem SMTP, foto roubada, contas Google, telefone não verificado, troca do contato de recuperação recente.
6. Não publicar até haver provas do servidor correto, autenticação forte no admin e do fator do titular funcionando.

## Escopo desta PR

Apenas esclarece no painel e em Minha conta que estar no mesmo dispositivo não concede privilégios extras sem passkey e retira link administrativo para painel de usuários do Supabase. O fluxo normal de mudança **com a senha atual** permanece igual, sem alterações nas APIs do provedor, dados, billing ou autorização.
