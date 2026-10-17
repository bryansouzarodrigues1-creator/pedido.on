# Pizzaria.on — decisão de lançamento controlado em 17/10/2026

**Duas plataformas distintas:** a produção funcional permanece no ChatGPT Sites em
`https://forno-cardapios.waves4845.chatgpt.site/criar`. A versão Lovable é
uma galeria de referências/handoff: não é o servidor de pedidos. GitHub
`pizzaria.on-chat` sincronizado **não** significa Lovable publicado nem sistema migrado.

## Estado confirmado no código (não equivale a homologação comercial)

- Cadastro público sem convites, Supabase Auth existente, criação de rascunho,
  vitrine, meio a meio, complementos, carrinho, pedido, painel, impressão, PWA e
  WhatsApp fazem parte da produção Sites atual. Não cobrar nem alterar limites.
- O pagamento do pedido pertence à pizzaria: não confundir com assinatura SaaS.
  Não marcar Pix como recebido sem conferência do dono.
- Trial de sete dias e planos R$49/R$89/R$149 existem, mas aplicação do corte
  por trial/assinatura está desligada. Não vender como ciclo financeiro concluído.
- Risco conhecido: OCR com cardápios reais ainda insuficiente (último benchmark
  6 de 21 nomes/preços simples exatos). Usar foto apenas com revisão de TODOS
  os preços/produtos; priorizar CSV ou digitação assistida, nunca publicar
  importação automática sem conferir.
- iFood por URL pode ser bloqueado; não alegar integração oficial homologada.
- Código GitHub para 12 estilos foi integrado na PR #41 **após** a v46 publicada;
  não prometer que a versão Sites pública já contém as 12 opções até verificar
  o artefato publicado. O Lovable as mostra, mas não vende.
- A nova base D1 Cloudflare staging contém somente registros parciais do backup
  de 13/10; não é o banco vivo atual, não tem R2 restaurado nem backend real.
  Worker de staging protegido responde 503 em vez de permitir operações.

## Critério para convidar 5–10 pizzarias hoje (beta limitado)

1. CI do `scripts/check-beta-live-readonly.py` passa: entrada/criação/login,
   páginas demonstração, Auth público, isolamento de APIs privadas e PWA.
   O CI nunca cria contas, pedidos ou pagamentos.
2. Em dois celulares reais, **com uma pizzaria de teste isolada**, confirmar:
   entrada com Supabase, nome/estilo, rascunho, preço do item, meio a meio,
   adicionais, entrega/retirada, checkout com **pagamento na entrega**,
   painel do pizzaiolo, alteração de status, via de cozinha e impressão.
   Criar pedidos fictícios só na loja de teste, não em lojas de clientes.
3. Confirmar como o dono recebe pedidos quando a aba/painel está fechado
   (não prometer push sem teste). Se não receber push, orientar deixar painel
   aberto e monitorar novas encomendas.
4. Para testar fotos/OCR, cada item e preço deve ser conferido antes de publicar.
5. O teste grátis é beta assistido; faturamento SaaS real, recuperação por e-mail,
   IA paga e corte automático só depois de testes específicos e autorização
   financeira. Não exigir cartão para o primeiro acesso.
6. Conferir que URLs e QR codes levam à vitrine certa e que um pedido de teste
   não aparece em outra pizzaria. Excluir dados de QA das métricas do piloto.

## Cutover da hospedagem: NÃO CONCLUÍDO

Cloudflare própria: D1 staging e Worker fechado já existem. Falta ativação R2
pelo titular, cópia integral atual do Sites (incluindo imagens privadas), secrets
de servidor e deploy/validação do backend Vinext independente.
**Não trocar domínio, webhook, OAuth ou URL principal enquanto isso faltar.**

## Gate de go/no-go

- **Convite assistido:** liberável SOMENTE após o checklist em dois celulares
  mais smoke público verde; informar limitações do OCR e pagamentos.
- **Venda irrestrita / migração anunciada:** NÃO liberar até teste financeiro
  real controlado, backup atual completo e implantação de todos os serviços.

Nenhuma mudança deste documento ativa cobranças, cria usuários ou mexe na
produção.
