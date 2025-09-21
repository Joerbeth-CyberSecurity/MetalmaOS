import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PausaExcedida {
  justificativa_id: string;
  os_id: string;
  numero_os: string;
  tempo_excedido_minutos: number;
}

export function usePausasExcedidas() {
  const [pausasExcedidas, setPausasExcedidas] = useState<PausaExcedida[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const verificarPausasExcedidas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verificar_pausas_excedidas');
      
      if (error) {
        console.error('Erro ao verificar pausas excedidas:', error);
        return;
      }

      if (data && data.length > 0) {
        setPausasExcedidas(data);
        
        // Mostrar notificações para cada pausa excedida
        data.forEach((pausa) => {
          toast({
            title: 'OS Reiniciada Automaticamente',
            description: `A OS ${pausa.numero_os} foi reiniciada automaticamente após exceder o tempo de tolerância (${Math.floor(pausa.tempo_excedido_minutos / 60)}h ${pausa.tempo_excedido_minutos % 60}min).`,
            variant: 'default',
          });

          // Marcar como notificada
          marcarComoNotificada(pausa.justificativa_id);
        });
      }
    } catch (error) {
      console.error('Erro ao verificar pausas excedidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoNotificada = async (justificativaId: string) => {
    try {
      await supabase.rpc('marcar_justificativa_excedida', {
        justificativa_uuid: justificativaId
      });
    } catch (error) {
      console.error('Erro ao marcar justificativa como notificada:', error);
    }
  };

  const reiniciarOS = async (osId: string) => {
    try {
      // Atualizar status da OS para em_andamento
      const { error: osError } = await supabase
        .from('ordens_servico')
        .update({ status: 'em_andamento' })
        .eq('id', osId);

      if (osError) throw osError;

      // Buscar colaboradores ativos na OS
      const { data: colaboradoresOS, error: colabError } = await supabase
        .from('os_colaboradores')
        .select('colaborador_id')
        .eq('os_id', osId)
        .eq('ativo', true);

      if (colabError) throw colabError;

      if (colaboradoresOS && colaboradoresOS.length > 0) {
        // Registrar reinício no os_tempo para cada colaborador
        const registrosTempo = colaboradoresOS.map(({ colaborador_id }) => ({
          os_id: osId,
          colaborador_id,
          tipo: 'trabalho',
          data_inicio: new Date().toISOString(),
        }));

        const { error: tempoError } = await supabase
          .from('os_tempo')
          .insert(registrosTempo);

        if (tempoError) throw tempoError;
      }

      toast({
        title: 'OS Reiniciada',
        description: 'A OS foi reiniciada automaticamente.',
      });

      // Remover da lista de pausas excedidas
      setPausasExcedidas(prev => prev.filter(p => p.os_id !== osId));
    } catch (error) {
      console.error('Erro ao reiniciar OS:', error);
      toast({
        title: 'Erro ao reiniciar OS',
        description: 'Não foi possível reiniciar a OS automaticamente.',
        variant: 'destructive',
      });
    }
  };

  // Verificar pausas excedidas a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(verificarPausasExcedidas, 5 * 60 * 1000);
    
    // Verificar imediatamente ao carregar
    verificarPausasExcedidas();

    return () => clearInterval(interval);
  }, []);

  return {
    pausasExcedidas,
    loading,
    verificarPausasExcedidas,
    reiniciarOS,
  };
}
