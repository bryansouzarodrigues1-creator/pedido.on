# Checagem final da publicação — oferta de 10 dias (25/10/2026)

A PR #125 integrou a oferta de 10 dias, mas não atualizou a tag de `components/auth-form.tsx`. A PR #126 atualizou a tag para `${TRIAL_DAYS} DIAS GRÁTIS`, no repositório principal e no espelho Lovable. As três baterias de CI (#126: auth/build, Windows, Chrome) passaram.

**Bloqueio:** o gateway Netlify e o backend Sites continuaram exibindo "1 MÊS GRÁTIS · 30 DIAS" em `/cadastro` após o merge. As telas de início e `/criar` já anunciam 10 dias. Portanto, PR integrado != deploy confirmado. O projeto Lovable é visual e não publica automaticamente o backend que atende o endereço Netlify.

## Instruções de implantação para o operador Work/Sites

1. No **projeto existente do backend ChatGPT Sites**, identificar a implantação atual, origem e variáveis, sem copiar segredos.
2. Atualizar a fonte do backend com a main do repositório `bryansouzarodrigues1-creator/pedido.on`, incluindo a PR #126, sem migração do banco, limpeza, nova configuração de autenticação ou alteração de chaves.
3. Preservar a base D1/R2 de produção, os dados dos clientes e vencimentos já concedidos. **Nunca rearmar PEDIDO_RESET_***.
4. Publicar o backend Sites existente e manter a Netlify como gateway; não substituir por projeto novo, prévia Lovable ou servidor alternativo.
5. Executar:
    `node --experimental-strip-types scripts/check-published-trial-copy.mjs https://forno-cardapios.waves4845.chatgpt.site`
    `node --experimental-strip-types scripts/check-published-trial-copy.mjs https://pizzaria-on.netlify.app`
   O script verifica somente as duas URLs permitidas, HTML do cadastro e prontidão da configuração de registro; não cria contas nem faz requisições POST.
6. Confirmar visualmente no navegador ambas as páginas com `10 DIAS GRÁTIS` e sem `30 DIAS`; testar login e volta ao criador sem dados de cliente.
7. Não habilitar `PEDIDO_BILLING_ENFORCED` ou `PEDIDO_TRIAL_ENFORCED` até validar o primeiro pagamento externo. Manter o limite IA de 7 imagens e 100 textos por trial completo. Não gerar IA paga em QA.
8. Se site público continuar desatualizado, checar versão do Sites por trás do gateway; Netlify não resolve cópia antiga do backend com simples merge no GitHub.

Status em 25/10/2026: publicação desta correção ainda **não confirmada**. O script deve falhar intencionalmente na versão pública antiga; isso é sinal correto, não motivo para reduzir a proteção do teste.
