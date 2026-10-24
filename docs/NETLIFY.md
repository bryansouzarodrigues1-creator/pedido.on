# Netlify — publicação concluída em 24/10/2026

## Estado atual

Produção pública: **https://pizzaria-on.netlify.app**. A audiência foi autorizada explicitamente pelo proprietário e confirmada no painel: qualquer pessoa pode acessar a produção; deploy previews continuam privados da equipe.

A consulta real a /api/hosting retornou HTTP 200, com origin=https://pizzaria-on.netlify.app, viaNetlify=true e dataReady=true. O aplicativo usa o servidor **Sites v88**, publicado com ambiente revisão 14. O novo domínio mantém D1, R2, Supabase, contas e chave interna de sessão existentes.

| Parte | Hospedagem |
| --- | --- |
| Endereço público e funções de encaminhamento | Netlify |
| Aplicativo e APIs | Sites/Workers atual, v88 |
| Pizzarias, pedidos e sessões | D1 atual |
| Fotos e comprovantes | R2 atual |
| Contas e senhas | Supabase Auth atual |
| Serviço de criação e frontend conectado | Lovable atual |

## Correções confirmadas

1. **Pacote completo:** o primeiro build tentava importar file:///lib/netlify-proxy.ts fora da pasta base. O preparo agora gera as duas funções e suas políticas em deploy/netlify/generated/, sem embutir valores de ambiente nos arquivos públicos.
2. **Cookies e assinatura:** mesmo após tornar a produção pública, o dispatcher removia Cookie. O diagnóstico temporário confirmou a mesma chave e divergência somente no cookie. O gateway encaminha apenas cookies __Host-pedido-* em um envelope AES-GCM, com chave derivada por HKDF. O servidor descriptografa o envelope e valida o MAC existente antes de usar seu conteúdo. O MAC continua vinculando método, URL, origem, timestamp, IP, cabeçalhos e corpo. Cookies de login do provedor não são encaminhados. Assinaturas antigas continuam verificadas durante a atualização. Os cabeçalhos temporários de diagnóstico foram removidos.
3. **Deploy automático:** a Netlify ignorava alterações nas políticas fora da pasta base. scripts/ignore-netlify-build.mjs acompanha as fontes canônicas e o preparo do pacote, ignora somente mudanças sem efeito no gateway e compila quando o cache/histórico são desconhecidos.
4. **Leitura do cardápio:** Calabresa — R$ 45,00 e Mussarela — R$ 40,00 viravam um item com preços conflitantes. Linhas curtas com hífen/travessão explícito agora mantêm sabores e valores separados. Os separadores finais saem do nome. Tamanhos ausentes continuam para confirmação do dono.

## Testes

- **623 testes locais aprovados**, zero falhas; TypeScript e build completos aprovados.
- Candidata final 40348d78bec8d2c4fc5b80afd8dad33340061358: Windows, Chrome, autenticação/pedidos e benchmark de leitura aprovados.
- As regressões cobrem Cookie removido no transporte, envelope inválido/ausente, cookie vazio, assinatura antiga, CSRF/propriedade e execução no runtime Workers.
- Detecção de build testada com commits Git reais em repositório temporário.
- No navegador pela Netlify: nome Sapore di Napoli preservado, três itens com R$ 45,00 / R$ 40,00 / R$ 6,00, capa carregada, mudança de modelo, **80 modelos selecionáveis** e busca.
- Salvar a pizzaria apresentou WhatsApp, e-mail e senha. Consultas de dados e criação sem login exigiram conta; não criaram dados.
- Calculadora: custo R$ 20,00 + despesas 15% + acréscimo 135% = preço R$ 50,00, lucro bruto R$ 30,00, reserva R$ 3,00 e sobra R$ 27,00. Duplicação, salvamento, recarga e CSV com os mesmos números conferidos.
- O CI próprio do espelho Lovable voltou a falhar **antes de disponibilizar etapas**; não é declarado aprovado. As fontes funcionais do espelho coincidem por SHA de árvore com o principal.
- Um CI Chrome intermediário falhou no seletor de anexo após a transição para a prévia. O seletor passou a acompanhar a ação de upload atual, preservando os cenários e assertivas. O CI final passou.

Serviços externos nos fixtures continuam simulados. Não houve cadastro, pedido, pagamento, e-mail, publicação de restaurante, migração ou chamada a modelo pago nesta entrega. As prévias e cálculos manuais ficaram no navegador de teste.

## Configuração

| Campo | Valor |
| --- | --- |
| Repositório Netlify | bryansouzarodrigues1-creator/pedido.on |
| Branch | main |
| Base | deploy/netlify |
| Build | node ../../scripts/prepare-netlify.mjs |
| Ignore | node ./../../scripts/ignore-netlify-build.mjs |
| Publish | public, relativo à base |
| Functions | generated/functions |
| Edge Functions | generated/edge-functions |
| Node | 24 |

PEDIDO_BACKEND_ORIGIN aponta para https://forno-cardapios.waves4845.chatgpt.site; PEDIDO_PUBLIC_ORIGIN aponta para https://pizzaria-on.netlify.app. PEDIDO_PROXY_SECRET permanece secreto e disponível nos escopos de execução/build necessários. Não registrar chaves, cookies, envelopes, assinaturas, IPs ou cabeçalhos de execução no GitHub.

O gateway publicado vem da correção #106; mudanças posteriores apenas no aplicativo são servidas pelo backend v88 e não precisam reconstruir o gateway. O filtro agora considera alterações futuras nas dependências compartilhadas. Não desabilitar MAC, CSRF ou propriedade para contornar falhas.

## Limites que permanecem

- Importação automática real do catálogo iFood continua sem homologação; esta publicação não resolve o bloqueio externo anterior. Arquivos do dono e revisão assistida continuam disponíveis.
- Pizzas sem tamanho exigem confirmação antes de vender. Fotos ilustrativas continuam identificadas; fotos de produtos do dono dependem do material enviado.
- Avaliações Google aparecem após o dono configurar, salvar e publicar seu próprio link. Nenhuma avaliação foi enviada.
- Cadastro/login real de cliente e cobrança em produção não foram executados neste teste. Google login e CAPTCHA não foram ativados por esta publicação.
- O backend continua no Sites atual; não houve migração integral para infraestrutura independente.

## Referências e continuidade

- Principal: #102 (pacote), #104 (diagnóstico temporário), #105 (detecção de build), #106 (cookies), #107 (sabores/preços).
- Espelho funcional: #58, merge 70dfe2b1c6a86016d1a3076eaa07fe2e4bb9b101.
- Árvore funcional compartilhada: 0b018004eb4eabbabdc84dbe13c73e7d0c4fae5b.
- Sites v88: fonte 698b5c7029c813be841161f14abf44347f6dea30, implantação appgdep_6adcfd3789c8819187ed837d50b86c7c.
- Netlify: produção 6adcfa8f08c2724ebd6be98c, gateway da6f516ed463edd72c225869f374bff2afe0adb9.
- CI final: Windows 40122060149; Chrome 40122060122; auth/pedidos 40122060169; leitura 40122060183.
- [Evidência sanitizada](evidence/netlify-20261024.json).
