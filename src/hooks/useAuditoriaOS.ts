import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export type AcaoAuditoriaOS = 
  | 'criar_os'
  | 'editar_os'
  | 'excluir_os'
  | 'iniciar_os'
  | 'reiniciar_os'
  | 'pausar_os'
  | 'parar_os'
  | 'finalizar_os'
  | 'adicionar_colaborador'
  | 'remover_colaborador'
  | 'cancelar_os'
  | 'reabrir_os';

interface RegistroAuditoriaOS {
  acao: AcaoAuditoriaOS;
  osId?: string;
  numeroOs?: string;
  dadosAnteriores?: Record<string, any>;
  dadosNovos?: Record<string, any>;
  detalhes?: string;
}

export function useAuditoriaOS() {
  const { toast } = useToast();

  const registrarAcao = async ({
    acao,
    osId,
    numeroOs,
    dadosAnteriores,
    dadosNovos,
    detalhes
  }: RegistroAuditoriaOS) => {
    try {
      // Usar a função SQL criada para registrar a auditoria
      const { error } = await supabase.rpc('registrar_auditoria_os', {
        p_acao: acao,
        p_os_id: osId || null,
        p_numero_os: numeroOs || null,
        p_dados_anteriores: dadosAnteriores || null,
        p_dados_novos: dadosNovos || null,
        p_detalhes: detalhes || null
      });

      if (error) {
        console.error('Erro ao registrar auditoria da OS:', error);
        // Não mostrar toast de erro para não interferir na UX
        // O sistema deve continuar funcionando mesmo se a auditoria falhar
      }
    } catch (err) {
      console.error('Erro inesperado na auditoria da OS:', err);
    }
  };

  // Funções específicas para cada tipo de ação
  const auditarCriacaoOS = async (os: any) => {
    await registrarAcao({
      acao: 'criar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosNovos: {
        numero_os: os.numero_os,
        cliente_id: os.cliente_id,
        descricao: os.descricao,
        valor_total: os.valor_total,
        status: os.status,
        prioridade: os.prioridade
      },
      detalhes: `OS ${os.numero_os} criada`
    });
  };

  const auditarEdicaoOS = async (osAnterior: any, osNova: any) => {
    await registrarAcao({
      acao: 'editar_os',
      osId: osNova.id,
      numeroOs: osNova.numero_os,
      dadosAnteriores: {
        descricao: osAnterior.descricao,
        valor_total: osAnterior.valor_total,
        status: osAnterior.status,
        prioridade: osAnterior.prioridade,
        observacoes: osAnterior.observacoes
      },
      dadosNovos: {
        descricao: osNova.descricao,
        valor_total: osNova.valor_total,
        status: osNova.status,
        prioridade: osNova.prioridade,
        observacoes: osNova.observacoes
      },
      detalhes: `OS ${osNova.numero_os} editada`
    });
  };

  const auditarExclusaoOS = async (os: any) => {
    await registrarAcao({
      acao: 'excluir_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: {
        numero_os: os.numero_os,
        cliente_id: os.cliente_id,
        descricao: os.descricao,
        valor_total: os.valor_total,
        status: os.status
      },
      detalhes: `OS ${os.numero_os} excluída`
    });
  };

  const auditarInicioOS = async (os: any, colaboradores?: any[]) => {
    await registrarAcao({
      acao: 'iniciar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: { status: os.status },
      dadosNovos: { 
        status: 'em_andamento',
        data_inicio: new Date().toISOString(),
        colaboradores: colaboradores?.map(c => c.nome) || []
      },
      detalhes: `OS ${os.numero_os} iniciada${colaboradores ? ` com ${colaboradores.length} colaborador(es)` : ''}`
    });
  };

  const auditarReinicioOS = async (os: any, colaboradores?: any[]) => {
    await registrarAcao({
      acao: 'reiniciar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: { status: os.status },
      dadosNovos: { 
        status: 'em_andamento',
        data_reinicio: new Date().toISOString(),
        colaboradores: colaboradores?.map(c => c.nome) || []
      },
      detalhes: `OS ${os.numero_os} reiniciada${colaboradores ? ` com ${colaboradores.length} colaborador(es)` : ''}`
    });
  };

  const auditarPausaOS = async (os: any, motivo?: string) => {
    await registrarAcao({
      acao: 'pausar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: { status: os.status },
      dadosNovos: { status: 'pausada' },
      detalhes: `OS ${os.numero_os} pausada${motivo ? `. Motivo: ${motivo}` : ''}`
    });
  };

  const auditarParadaOS = async (os: any, motivo?: string) => {
    await registrarAcao({
      acao: 'parar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: { status: os.status },
      dadosNovos: { status: 'falta_material' },
      detalhes: `OS ${os.numero_os} parada por falta de material${motivo ? `. Motivo: ${motivo}` : ''}`
    });
  };

  const auditarFinalizacaoOS = async (os: any) => {
    await registrarAcao({
      acao: 'finalizar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: { status: os.status },
      dadosNovos: { 
        status: 'finalizada',
        data_fim: new Date().toISOString()
      },
      detalhes: `OS ${os.numero_os} finalizada`
    });
  };

  const auditarCancelamentoOS = async (os: any, motivo?: string) => {
    await registrarAcao({
      acao: 'cancelar_os',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: { status: os.status },
      dadosNovos: { status: 'cancelada' },
      detalhes: `OS ${os.numero_os} cancelada${motivo ? `. Motivo: ${motivo}` : ''}`
    });
  };

  const auditarAdicaoColaborador = async (os: any, colaborador: any) => {
    await registrarAcao({
      acao: 'adicionar_colaborador',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosNovos: {
        colaborador_id: colaborador.id,
        colaborador_nome: colaborador.nome
      },
      detalhes: `Colaborador ${colaborador.nome} adicionado à OS ${os.numero_os}`
    });
  };

  const auditarRemocaoColaborador = async (os: any, colaborador: any) => {
    await registrarAcao({
      acao: 'remover_colaborador',
      osId: os.id,
      numeroOs: os.numero_os,
      dadosAnteriores: {
        colaborador_id: colaborador.id,
        colaborador_nome: colaborador.nome
      },
      detalhes: `Colaborador ${colaborador.nome} removido da OS ${os.numero_os}`
    });
  };

  return {
    registrarAcao,
    auditarCriacaoOS,
    auditarEdicaoOS,
    auditarExclusaoOS,
    auditarInicioOS,
    auditarReinicioOS,
    auditarPausaOS,
    auditarParadaOS,
    auditarFinalizacaoOS,
    auditarCancelamentoOS,
    auditarAdicaoColaborador,
    auditarRemocaoColaborador
  };
}
