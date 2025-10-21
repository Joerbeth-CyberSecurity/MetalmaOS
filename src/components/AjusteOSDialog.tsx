import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, FileText, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuditoriaOS } from '@/hooks/useAuditoriaOS';

interface AjusteOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  os: any;
}

interface ColaboradorAjuste {
  id: string;
  nome: string;
  horas_originais: number;
  horas_ajustadas: number;
  diferenca: number;
  justificativa: string;
}

export function AjusteOSDialog({ open, onOpenChange, os }: AjusteOSDialogProps) {
  const [colaboradores, setColaboradores] = useState<ColaboradorAjuste[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { auditarAjusteHorasOS } = useAuditoriaOS();

  useEffect(() => {
    if (open && os) {
      loadColaboradores();
    }
  }, [open, os]);

  const loadColaboradores = async () => {
    if (!os) return;

    setLoading(true);
    try {
      // Buscar colaboradores da OS com suas horas trabalhadas
      const { data: colaboradoresData, error } = await supabase
        .from('os_colaboradores')
        .select(`
          id,
          colaborador_id,
          horas_trabalhadas,
          colaboradores (
            id,
            nome
          )
        `)
        .eq('os_id', os.id)
        .eq('ativo', true);

      if (error) throw error;

      const colaboradoresAjuste: ColaboradorAjuste[] = (colaboradoresData || []).map((colab: any) => ({
        id: colab.id,
        nome: colab.colaboradores?.nome || 'N/A',
        horas_originais: colab.horas_trabalhadas || 0,
        horas_ajustadas: colab.horas_trabalhadas || 0,
        diferenca: 0,
        justificativa: ''
      }));

      setColaboradores(colaboradoresAjuste);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      toast({
        title: 'Erro ao carregar colaboradores',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHorasChange = (colaboradorId: string, novasHoras: number) => {
    setColaboradores(prev => prev.map(colab => {
      if (colab.id === colaboradorId) {
        const diferenca = novasHoras - colab.horas_originais;
        return {
          ...colab,
          horas_ajustadas: novasHoras,
          diferenca
        };
      }
      return colab;
    }));
  };

  const handleJustificativaChange = (colaboradorId: string, justificativa: string) => {
    setColaboradores(prev => prev.map(colab => {
      if (colab.id === colaboradorId) {
        return { ...colab, justificativa };
      }
      return colab;
    }));
  };

  const handleSave = async () => {
    if (!os) return;

    // Validar se há ajustes
    const temAjustes = colaboradores.some(colab => colab.diferenca !== 0);
    if (!temAjustes) {
      toast({
        title: 'Nenhum ajuste realizado',
        description: 'Não há alterações para salvar.',
        variant: 'destructive'
      });
      return;
    }

    // Validar justificativas
    const semJustificativa = colaboradores.filter(colab => colab.diferenca !== 0 && !colab.justificativa.trim());
    if (semJustificativa.length > 0) {
      toast({
        title: 'Justificativas obrigatórias',
        description: 'Todos os ajustes de horas devem ter justificativa.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Salvar ajustes no banco
      for (const colab of colaboradores) {
        if (colab.diferenca !== 0) {
          await supabase
            .from('os_colaboradores')
            .update({ 
              horas_trabalhadas: colab.horas_ajustadas,
              updated_at: new Date().toISOString()
            })
            .eq('id', colab.id);

          // Registrar auditoria
          await auditarAjusteHorasOS(os, colab, colab.horas_originais, colab.horas_ajustadas, colab.justificativa);
        }
      }

      toast({
        title: 'Ajustes salvos com sucesso!',
        description: `OS ${os.numero_os} - Horas ajustadas para ${colaboradores.filter(c => c.diferenca !== 0).length} colaborador(es).`
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar ajustes:', error);
      toast({
        title: 'Erro ao salvar ajustes',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!os) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ajuste de Horas - OS {os.numero_os}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da OS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da OS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm text-muted-foreground">{os.cliente?.nome || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Abertura</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(os.data_abertura)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant="outline">{os.status}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Valor Total</Label>
                  <p className="text-sm font-medium">{formatCurrency(os.valor_total || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colaboradores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Colaboradores e Horas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Carregando colaboradores...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {colaboradores.map((colab) => (
                    <div key={colab.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{colab.nome}</span>
                        </div>
                        {colab.diferenca !== 0 && (
                          <Badge variant={colab.diferenca > 0 ? "default" : "destructive"}>
                            {colab.diferenca > 0 ? '+' : ''}{colab.diferenca.toFixed(2)}h
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`horas-${colab.id}`}>Horas Trabalhadas</Label>
                          <Input
                            id={`horas-${colab.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={colab.horas_ajustadas}
                            onChange={(e) => handleHorasChange(colab.id, parseFloat(e.target.value) || 0)}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Original: {colab.horas_originais.toFixed(2)}h
                          </p>
                        </div>

                        <div>
                          <Label htmlFor={`justificativa-${colab.id}`}>Justificativa do Ajuste</Label>
                          <Input
                            id={`justificativa-${colab.id}`}
                            value={colab.justificativa}
                            onChange={(e) => handleJustificativaChange(colab.id, e.target.value)}
                            placeholder="Motivo do ajuste de horas..."
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {colaboradores.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum colaborador encontrado para esta OS.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo dos Ajustes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total de colaboradores:</span>
                  <span className="font-medium">{colaboradores.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Colaboradores com ajustes:</span>
                  <span className="font-medium">
                    {colaboradores.filter(c => c.diferenca !== 0).length}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total de horas ajustadas:</span>
                  <span>
                    {colaboradores.reduce((sum, c) => sum + c.diferenca, 0).toFixed(2)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || colaboradores.filter(c => c.diferenca !== 0).length === 0}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Ajustes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
