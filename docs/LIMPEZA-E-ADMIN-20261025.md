# Reinício autorizado das contas e novo administrador

O proprietário autorizou apagar todas as contas e dados de teste da Pizzaria.on, incluindo o administrador anterior. Isso é uma operação excepcional; não altera a política de preservar dados em publicações comuns. Não apaga o projeto Supabase, a infraestrutura, as configurações, o código nem outros projetos.

## Estado antes da publicação

- Supabase: os dez usuários anteriores foram removidos; usuários, identidades, sessões e refresh tokens conferidos em zero.
- Bases antigas beta/staging: todas as tabelas de negócio conferidas em zero; ambos os buckets de mídia já estavam vazios.
- Base principal e mídia: limpeza ainda depende da execução da manutenção publicada. Não interpretar esta nota como confirmação de conclusão.
- Asaas: configuração de produção preservada. A consulta de saúde real ainda depende da manutenção. Não foi criada, paga nem cancelada cobrança.

## Administrador sem reutilizar contas antigas

O novo administrador recebe um convite privado, de uso único, vinculado ao e-mail escolhido pelo proprietário. O token fica somente na memória da página durante o cadastro; o fragmento é removido do endereço e não é salvo no cartão de acesso ou no armazenamento local. O servidor confere e-mail, hash e validade. O gatilho privado no Supabase consome o convite atomicamente, remove-o dos metadados do usuário e da identidade e grava a autoridade em `app_metadata`, que o titular não pode editar.

O e-mail sozinho não concede administração em um cadastro aberto sem confirmação. O administrador escolhe a própria senha. O acesso antigo por ChatGPT pode ser desativado por configuração; a sessão Supabase é revalidada no provedor a cada leitura. Nenhuma senha real é criada ou alterada por esta manutenção.

O SQL de esquema é [admin-enrollment.sql](sql/admin-enrollment.sql). Seus valores de execução são configurados em privado e nunca entram no repositório. Nenhum RPC de recuperação ou de impersonação foi adicionado.

## Manutenção excepcional

A nova migração cria apenas `platform_maintenance_runs`. A execução exige três variáveis privadas de manutenção: identificador único, prazo curto e corte temporal. Sem elas o código não realiza consultas ou exclusões. Não existe endpoint público que aceite alvos ou SQL.

A rotina confere o esquema conhecido, exclui somente arquivos anteriores ao corte e limpa as 34 tabelas de negócio em um lote transacional com o marcador de conclusão. Ela pode retomar após falha. O mesmo identificador concluído nunca é executado novamente. O login/cadastro ficam temporariamente bloqueados enquanto o proprietário mantém a janela armada; as variáveis devem ser removidas e a versão republicada após a conferência final.

O relatório guarda apenas contagens e indicadores de saúde do Asaas: modo, HTTP, presença/estado do webhook esperado e fiscalização comercial. As consultas externas são somente GET. Não guarda nomes, e-mails, tokens, URLs de cobrança ou dados de clientes.

## Validação

- 661 testes locais aprovados, incluindo vínculo ao e-mail, validade, metadados confiáveis e falhas/retomada da limpeza.
- TypeScript aprovado; seis testes focados reexecutados após o ajuste de tipos, todos aprovados.
- A validação do gatilho de cadastro com tabelas temporárias não foi concluída: a aprovação da ferramenta foi cancelada. O teste prévio da função de consumo, expiração, e-mail/token incorretos e repetição foi aprovado em transação revertida, sem criar usuários reais.
- A suíte Chrome usa uma inscrição simulada e um convite sintético para conferir remoção do fragmento e ausência no cartão/armazenamento local. Não cria uma conta real.

Publicação, CI final, contagens da base principal e resultado real do Asaas devem ser registrados após a execução. MFA, passkeys e recuperação pelo titular continuam na issue #116; não estão implementados por este pacote.
