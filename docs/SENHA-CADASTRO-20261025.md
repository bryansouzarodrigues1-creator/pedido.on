# Cadastro com senha a partir de seis caracteres

O mínimo de doze caracteres bloqueava o cadastro do criador sem explicar a regra antes do envio; a validação nativa podia aparecer em inglês conforme o idioma do navegador.

Após a v95 com oito caracteres, o proprietário pediu cinco. O Supabase impõe um piso de seis: sua configuração eleva automaticamente qualquer mínimo menor que seis para esse valor. Fonte primária: https://github.com/supabase/auth/blob/master/internal/conf/configuration.go (`defaultMinPasswordLength` e aplicação dos padrões de senha). A aplicação foi ajustada ao menor mínimo compatível, sem substituir a autenticação ou utilizar hashes importados para contornar a regra.

As contas comuns passam a aceitar seis a 128 caracteres, sem exigir uma combinação específica de maiúsculas, números ou símbolos. A regra é compartilhada entre cadastro rápido, tela de cadastro, troca/recuperação e API. O login continua aceitando credenciais já existentes sem aplicar um mínimo novo.

Os formulários mostram a orientação antes do envio. Mensagens de senha vazia ou curta são apresentadas em português, e a validação é limpa quando a pessoa volta a editar. A prévia e os demais campos são preservados quando a senha precisa ser corrigida.

O convite de administrador e a troca de senha de uma conta administradora conservam o mínimo de doze caracteres. A API verifica o papel no servidor, sem confiar no campo enviado pelo navegador. O suporte continua sem acesso às senhas.

As verificações usam credenciais fictícias e provedor de autenticação simulado: limite de cinco/seis caracteres, sessão protegida após cadastro, limites administrativos e fluxo de salvar uma pizzaria com seis caracteres no Chrome. Nenhuma conta ou senha real foi criada ou alterada para testar. A imagem enviada pelo proprietário e seus dados não fazem parte dos testes ou do repositório.

A publicação não ativa manutenção, não apaga dados, não muda sessão/SMTP/cobrança e preserva a oferta de 30 dias grátis. Não há geração de IA paga.
