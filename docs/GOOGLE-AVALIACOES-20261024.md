# Avaliar no Google — v86, 24/10/2026

Publicado no Sites em **24/10/2026 às 07:36 de Brasília**, com ambiente revisão 13. A atualização também está servida no Lovable: página inicial e a nova folha de estilos responderam HTTP 200.

## Configurar na pizzaria

1. No painel, abrir **Pizzaria → Avaliações no Google**.
2. Colar o link obtido no Perfil da Empresa do Google: **Ler avaliações → Receba mais avaliações → Copiar link**. Também aceita link curto do Maps.
3. Usar **Testar link no Google** e conferir se abre a pizzaria correta.
4. Salvar e publicar. Para remover, deixar o campo vazio, salvar e publicar novamente.

O cliente encontra **Avaliar no Google** no rodapé do cardápio e um convite destacado após o pedido concluído. O texto pede uma experiência autêntica, sem nota predefinida ou incentivo. Exemplos e prévias não exibem o convite.

## Comportamento

O campo é opcional e compatível com cadastros antigos. Links precisam ser HTTPS e usar os formatos aceitos do Google; domínios parecidos, credenciais, portas alternativas e destinos arbitrários são recusados. Parâmetros adicionais e fragmentos são removidos. A abertura usa nova aba, noopener/noreferrer e política sem referenciador.

A página privada do pedido usa apenas a configuração publicada da própria pizzaria. Salvar um rascunho ou alterar outra loja não muda esse destino. Nenhum nome é convertido automaticamente em um perfil Google presumido.

Sem migração, atualização em massa de lojas, nova dependência, API paga ou envio automático de avaliações. O proprietário precisa configurar seu link para ativar o recurso.

## Validação

**617 testes locais**, TypeScript e build aprovados, incluindo oito cenários novos: destinos válidos/inválidos, compatibilidade, renderização React, etapas do pedido, rotas reais com SQLite descartável, propriedade e salvar/publicar/remover.

CI principal: Chrome `40086449711`, Windows `40086449712` e auth/pedidos `40086449708` aprovados. O job de chat `40086449750` falhou inicialmente na preparação da fixture Miniflare; a reexecução do mesmo job passou sem mudança do aplicativo.

Limites: a prévia gerenciada recusou a conexão do navegador, portanto não houve conferência visual manual desta tela. O GET deste executor ao Sites retornou 403/código 1010; a implantação nativa foi confirmada e o CI Chrome externo passou. O CI do espelho `40086451427` falhou antes de disponibilizar etapas/logs e não é declarado aprovado. Os testes usam dados descartáveis e serviços externos simulados; nenhuma avaliação foi publicada no Google.

## Referências da entrega

- PR principal [#100](https://github.com/bryansouzarodrigues1-creator/pedido.on/pull/100), merge `813a7b27bf89fa3258d4a4237c266fdf06cc3804`.
- Espelho [#54](https://github.com/bryansouzarodrigues1-creator/pizzaria.on-chat/pull/54), merge `ab2e7da7b12d7d037e3f91f182c1eb46960457c8`; nova folha de estilos registrada no root TanStack.
- Fonte Sites `d8f7c862af72590d87e52c1a1cf28d63a911e83b`, árvore `2027ee5da1d1bdf2ed5003f3d0b3cbb7a3d33b29`, implantação `appgdep_6adc8a234c048191b638b3c60f50b5d8`.
- [Evidência sanitizada](evidence/google-avaliacoes-20261024.json).
- [Sites](https://forno-cardapios.waves4845.chatgpt.site) · [Lovable](https://pizzaria-on-estilos.lovable.app).
- [Google: como obter o link](https://support.google.com/business/answer/16816815?hl=pt-BR).
