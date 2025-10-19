Contexto rápido (não-documental)

- Problema: ao finalizar um colaborador e reapontá-lo em outro serviço/produto na mesma OS, a tela mostra o status herdado como "finalizado" no novo apontamento. Esperado: aparecer como "apontado" (sem status ativo) até clicar em Iniciar, e iniciar apenas o serviço atual desse colaborador.

- Ajuste feito: na `src/pages/OrdensServico.tsx`, o cálculo de status agora usa `os_tempo.colaborador_id` e checa associação atual em `os_colaboradores_produtos`. Regra: se não há tempo ativo e há associação atual, status = "apontado"; só vira "finalizado" se não houver associação atual. Também adicionados logs de depuração no cálculo.

- Onde ver logs: abrir a lista de OS (carrega `OrdensServico.tsx`). O console registra linhas com prefixo `[OS Status]` contendo número da OS, id do colaborador, status calculado e contadores.

- Para continuar caso a sessão mude: reabrir `OrdensServico.tsx`, buscar por `[OS Status]` e por `associadosNaOS`, e validar se o colaborador reapontado aparece como "apontado" ao associá-lo via `os_colaboradores_produtos` sem tempos ativos. Se ainda iniciar múltiplos serviços juntos, revisar `handleStartOS` para iniciar apenas o colaborador/produto atual (usar `os_colaboradores_produtos` e preencher `os_tempo.produto_id`).

Atualizações aplicadas (incrementais e seguras)

- Logs detalhados adicionados nas ações: iniciar OS, pausar/parar OS (geral e por colaborador), finalizar OS, seleção/ação por colaborador. Prefixos: `[OS Iniciar]`, `[OS Justificativa]`, `[OS Colaborador Seleção]`, `[OS Finalizar]`.
- Status de colaborador na lista: agora prioriza associação atual (via `os_colaboradores_produtos`) e exibe "apontado" quando não há tempo ativo, evitando herdar "finalizado" do histórico.
- Compatibilidade UI: foi preenchido o `colaborador` em `os_tempo` a partir de `colaborador_id` (apenas para exibição), sem mudar a lógica persistida.
- Início por colaborador/produto: na tabela (`OSResponsiveTable`), ao clicar no ícone de Play do badge quando o status for "Apontado", é chamado `onStartColaborador` com `produto_id` (quando disponível), e o back-end grava `os_tempo` com `produto_id`, iniciando apenas o serviço atual daquele colaborador.
- Painel de Logs DEV removido por solicitação do usuário (mantidos apenas `console.log` internos quando em DEV, sem exibir painel na UI).

Como reproduzir e validar (passo a passo)

1) Criar OS com ao menos 2 produtos (Produto A e Produto B) e apontar o Colaborador X no Produto A.
2) Na listagem, ver o painel "Logs de Depuração (somente DEV)" e acompanhar as linhas `[OS Status]` mostrando X como "Apontado" no Produto A.
3) Clique o ícone Play do Colaborador X (Produto A). Painel deve mostrar entradas `[OS Iniciar]`/`[OS Status]` com TRABALHO iniciado.
4) Finalize o colaborador X (Seleção de Colaborador → Finalização). Painel deve exibir `[OS Colab]` e `[OS Justificativa]` com fechamento e auditoria.
5) Reapontar X no Produto B. Painel deve mostrar `[OS Status]` indicando "Apontado" para o novo produto.
6) Clique Play no Colaborador X do Produto B: Painel deve registrar TRABALHO apenas para este produto, sem reabrir o anterior.

Próximos passos

- Validar o fluxo acima usando exclusivamente o painel de logs DEV. Se algum comportamento não estiver conforme o esperado, anotar a linha do painel e o número da OS.
- Se necessário, refinar a apresentação do status por produto usando `produto_id` também na leitura dos tempos para granularidade máxima.

Diagnóstico no banco (novo)

- Adicionado `debug_os_diagnostico.sql` com SELECTs para auditar a OS/Colaborador/Produto:
  - CTX: ids resolvidos (OS, colaborador, produtos).
  - APONTAMENTOS: linhas `os_colaboradores_produtos` para o colaborador.
  - TEMPOS: linhas `os_tempo` do colaborador na OS.
  - DIAG: status inferido por produto considerando `apontado_em`, tempos ativos e se houve TRABALHO após o apontamento.
- Editar os parâmetros no topo do arquivo se precisar testar outra OS/colaborador/produto.

Correção segura no banco (pontual)

- Adicionado `debug_fix_os_status.sql` com dois blocos independentes:
  1) Preenche `os_tempo.produto_id` quando está NULL, usando o apontamento ativo mais próximo antes do `data_inicio`.
  2) Garante que o `created_at` do apontamento do produto antigo fique anterior ao primeiro TRABALHO do colaborador na OS (evita que um reapontamento posterior confunda a inferência).
- Passos: executar bloco 1, depois bloco 2; em seguida rodar o bloco DIAG do `debug_os_diagnostico.sql` para verificar se o produto antigo aparece como "finalizado" e o novo como "apontado".


