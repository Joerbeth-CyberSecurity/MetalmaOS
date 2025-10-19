import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Clock, User } from 'lucide-react';

interface Colaborador {
  id: string;
  nome: string;
  status?: string; // Adicionar status do colaborador
}

interface ColaboradorSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (colaboradorId: string, justificativa: string) => void;
  tipo: 'pausa' | 'parada' | 'finalizacao';
  osNumero: string;
  colaboradores: Colaborador[];
  tempoTolerancia?: number; // em minutos
  loading?: boolean;
}

export function ColaboradorSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  tipo,
  osNumero,
  colaboradores,
  tempoTolerancia,
  loading = false,
}: ColaboradorSelectionDialogProps) {
  const [justificativa, setJustificativa] = useState('');
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string>('');

  const handleConfirm = () => {
    if (colaboradorSelecionado) {
      onConfirm(colaboradorSelecionado, justificativa.trim());
      setJustificativa('');
      setColaboradorSelecionado('');
    }
  };

  const handleCancel = () => {
    setJustificativa('');
    setColaboradorSelecionado('');
    onOpenChange(false);
  };

  const getTitle = () => {
    if (tipo === 'pausa') {
      return 'Pausar Colaborador';
    } else if (tipo === 'parada') {
      return 'Parar Colaborador';
    }
    return 'Finalizar Colaborador';
  };

  const getDescription = () => {
    if (tipo === 'pausa') {
      return `Selecione o colaborador da OS ${osNumero} que será pausado. ${
        tempoTolerancia 
          ? `Após ${tempoTolerancia} minutos, a OS será automaticamente reiniciada e o tempo não será contabilizado.`
          : ''
      }`;
    } else if (tipo === 'parada') {
      return `Selecione o colaborador da OS ${osNumero} que será parado. Esta ação afetará a produtividade e os relatórios.`;
    }
    return `Selecione o colaborador da OS ${osNumero} que será finalizado.`;
  };

  const getIcon = () => {
    if (tipo === 'pausa') {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else if (tipo === 'parada') {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    return <User className="h-5 w-5 text-green-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Colaboradores apontados na OS:</Label>
            <RadioGroup
              value={colaboradorSelecionado}
              onValueChange={setColaboradorSelecionado}
              className="mt-2"
            >
              {colaboradores
                .filter(colaborador => {
                  // Filtrar colaboradores que já estão pausados, parados ou finalizados
                  const status = colaborador.status;
                  if (tipo === 'pausa' && (status === 'pausado' || status === 'parado' || status === 'finalizado')) {
                    return false;
                  }
                  if (tipo === 'parada' && (status === 'pausado' || status === 'parado' || status === 'finalizado')) {
                    return false;
                  }
                  if (tipo === 'finalizacao' && (status === 'finalizado')) {
                    return false;
                  }
                  return true;
                })
                .map((colaborador) => (
                  <div key={colaborador.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={colaborador.id} id={colaborador.id} />
                    <Label htmlFor={colaborador.id} className="text-sm">
                      {colaborador.nome}
                      {colaborador.status && colaborador.status !== 'ativo' && (
                        <span className={`ml-2 text-xs px-2 py-1 rounded ${
                          colaborador.status === 'pausado' ? 'bg-yellow-100 text-yellow-800' :
                          colaborador.status === 'parado' ? 'bg-red-100 text-red-800' :
                          colaborador.status === 'finalizado' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {colaborador.status}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
            
            {colaboradores.filter(colaborador => {
              const status = colaborador.status;
              if (tipo === 'pausa' && (status === 'pausado' || status === 'parado' || status === 'finalizado')) {
                return true;
              }
              if (tipo === 'parada' && (status === 'pausado' || status === 'parado' || status === 'finalizado')) {
                return true;
              }
              if (tipo === 'finalizacao' && (status === 'finalizado')) {
                return true;
              }
              return false;
            }).length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Colaboradores não disponíveis para esta ação:</p>
                <ul className="list-disc list-inside mt-1">
                  {colaboradores
                    .filter(colaborador => {
                      const status = colaborador.status;
                      if (tipo === 'pausa' && (status === 'pausado' || status === 'parado' || status === 'finalizado')) {
                        return true;
                      }
                      if (tipo === 'parada' && (status === 'pausado' || status === 'parado' || status === 'finalizado')) {
                        return true;
                      }
                      if (tipo === 'finalizacao' && (status === 'finalizado')) {
                        return true;
                      }
                      return false;
                    })
                    .map((colaborador) => (
                      <li key={colaborador.id}>
                        {colaborador.nome} ({colaborador.status})
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="justificativa">Justificativa (opcional)</Label>
            <Textarea
              id="justificativa"
              placeholder="Descreva o motivo da pausa/parada/finalização..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="min-h-[100px]"
              disabled={loading}
            />
          </div>

          {tipo === 'pausa' && tempoTolerancia && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Tempo de Tolerância</span>
              </div>
              <p className="mt-1">
                Esta OS pode ficar pausada por até {tempoTolerancia} minutos sem afetar 
                a produtividade e relatórios. Após esse período, será automaticamente reiniciada.
              </p>
            </div>
          )}

          {tipo === 'parada' && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Impacto na Produtividade</span>
              </div>
              <p className="mt-1">
                Esta ação afetará diretamente a produtividade, eficiência e relatórios.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!colaboradorSelecionado || loading}
            variant={tipo === 'parada' ? 'destructive' : 'default'}
          >
            {loading ? 'Processando...' : `Confirmar ${tipo === 'pausa' ? 'Pausa' : tipo === 'parada' ? 'Parada' : 'Finalização'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
