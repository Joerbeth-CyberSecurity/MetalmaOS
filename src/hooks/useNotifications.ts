import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export interface Notification {
  id: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_criacao: string;
  dados_extras?: any;
}

export interface SecurityAlert {
  id: string;
  tipo_alerta: string;
  severidade: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  titulo: string;
  descricao: string | null;
  resolvido: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchSecurityAlerts();
      setupRealtimeSubscriptions();
    } else {
      setLoading(false);
    }

    return () => {
      // Cleanup subscriptions
      supabase.removeAllChannels();
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // Por enquanto, vamos simular notificações
      // Em uma implementação real, você teria uma tabela de notificações
      const mockNotifications: Notification[] = [
        {
          id: '1',
          tipo: 'info',
          titulo: 'Sistema Atualizado',
          mensagem: 'O sistema foi atualizado com novas funcionalidades de segurança.',
          lida: false,
          data_criacao: new Date().toISOString(),
        },
        {
          id: '2',
          tipo: 'warning',
          titulo: 'OS Atrasada',
          mensagem: 'A OS OS0001/2024 está atrasada em 2 dias.',
          lida: false,
          data_criacao: new Date(Date.now() - 3600000).toISOString(),
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.lida).length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alertas_seguranca')
        .select('*')
        .eq('resolvido', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar alertas de segurança:', error);
        return;
      }

      setSecurityAlerts(data || []);
    } catch (error) {
      console.error('Erro ao buscar alertas de segurança:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscription para alertas de segurança
    const securityAlertsChannel = supabase
      .channel('security_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertas_seguranca'
        },
        (payload) => {
          const newAlert = payload.new as SecurityAlert;
          setSecurityAlerts(prev => [newAlert, ...prev]);
          
          // Mostrar toast para alertas críticos
          if (newAlert.severidade === 'CRITICAL') {
            toast({
              title: '🚨 Alerta Crítico de Segurança',
              description: newAlert.titulo,
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    // Subscription para auditoria de login (para detectar tentativas suspeitas)
    const loginAuditChannel = supabase
      .channel('login_audit')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auditoria_login'
        },
        (payload) => {
          const loginEvent = payload.new as any;
          
          // Detectar tentativas de login suspeitas
          if (loginEvent.tipo_evento === 'FAILED_LOGIN') {
            // Verificar se há muitas tentativas falhadas recentes
            checkSuspiciousActivity(loginEvent);
          }
        }
      )
      .subscribe();
  };

  const checkSuspiciousActivity = async (loginEvent: any) => {
    try {
      // Verificar tentativas de login falhadas nos últimos 15 minutos
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: recentFailures, error } = await supabase
        .from('auditoria_login')
        .select('*')
        .eq('tipo_evento', 'FAILED_LOGIN')
        .gte('data_hora', fifteenMinutesAgo)
        .eq('ip_address', loginEvent.ip_address);

      if (error) {
        console.error('Erro ao verificar atividade suspeita:', error);
        return;
      }

      // Se houver mais de 3 tentativas falhadas, criar alerta
      if (recentFailures && recentFailures.length > 3) {
        await supabase.rpc('criar_alerta_seguranca', {
          p_tipo_alerta: 'MULTIPLE_FAILED_LOGINS',
          p_severidade: 'HIGH',
          p_titulo: 'Múltiplas tentativas de login falhadas',
          p_descricao: `Detectadas ${recentFailures.length} tentativas de login falhadas do IP ${loginEvent.ip_address} nos últimos 15 minutos.`,
          p_usuario_id: loginEvent.usuario_id,
          p_dados_contexto: {
            ip_address: loginEvent.ip_address,
            tentativas: recentFailures.length,
            periodo: '15 minutos'
          }
        });
      }
    } catch (error) {
      console.error('Erro ao verificar atividade suspeita:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, lida: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, lida: true }))
    );
    setUnreadCount(0);
  };

  const resolveSecurityAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alertas_seguranca')
        .update({
          resolvido: true,
          resolvido_por: user?.id,
          resolvido_em: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('Erro ao resolver alerta:', error);
        return;
      }

      setSecurityAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, resolvido: true }
            : alert
        )
      );
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  const createNotification = useCallback((
    tipo: Notification['tipo'],
    titulo: string,
    mensagem: string,
    dados_extras?: any
  ) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      tipo,
      titulo,
      mensagem,
      lida: false,
      data_criacao: new Date().toISOString(),
      dados_extras
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Mostrar toast
    toast({
      title: titulo,
      description: mensagem,
      variant: tipo === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  const createSecurityAlert = useCallback(async (
    tipo_alerta: string,
    severidade: SecurityAlert['severidade'],
    titulo: string,
    descricao: string,
    dados_contexto?: any
  ) => {
    try {
      const { data, error } = await supabase.rpc('criar_alerta_seguranca', {
        p_tipo_alerta: tipo_alerta,
        p_severidade: severidade,
        p_titulo: titulo,
        p_descricao: descricao,
        p_dados_contexto: dados_contexto
      });

      if (error) {
        console.error('Erro ao criar alerta de segurança:', error);
        return;
      }

      // Atualizar lista local
      await fetchSecurityAlerts();
    } catch (error) {
      console.error('Erro ao criar alerta de segurança:', error);
    }
  }, []);

  return {
    notifications,
    securityAlerts,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    resolveSecurityAlert,
    createNotification,
    createSecurityAlert,
    refreshNotifications: fetchNotifications,
    refreshSecurityAlerts: fetchSecurityAlerts
  };
}
