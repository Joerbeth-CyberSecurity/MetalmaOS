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
import { AlertTriangle, Clock } from 'lucide-react';

interface JustificativaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (justificativa: string) => void;
  tipo: 'pausa' | 'parada';
  osNumero: string;
  tempoTolerancia?: number; // em minutos
  loading?: boolean;
}

export function JustificativaDialog({
  open,
  onOpenChange,
  onConfirm,
  tipo,
  osNumero,
  tempoTolerancia,
  loading = false,
}: JustificativaDialogProps) {
  const [justificativa, setJustificativa] = useState('');

  const handleConfirm = () => {
    if (justificativa.trim()) {
      onConfirm(justificativa.trim());
      setJustificativa('');
    }
  };

  const handleCancel = () => {
    setJustificativa('');
    onOpenChange(false);
  };

  const getTitle = () => {
    if (tipo === 'pausa') {
      return 'Pausar OS';
    }
    return 'Parar OS';
  };

  const getDescription = () => {
    if (tipo === 'pausa') {
      return `Informe o motivo da pausa da OS ${osNumero}. ${
        tempoTolerancia 
          ? `Após ${tempoTolerancia} minutos, a OS será automaticamente reiniciada e o tempo não será contabilizado.`
          : ''
      }`;
    }
    return `Informe o motivo da parada da OS ${osNumero}. Esta ação afetará a produtividade e os relatórios.`;
  };

  const getIcon = () => {
    if (tipo === 'pausa') {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
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
            <Label htmlFor="justificativa">Justificativa *</Label>
            <Textarea
              id="justificativa"
              placeholder="Descreva o motivo da pausa/parada..."
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
            disabled={!justificativa.trim() || loading}
            variant={tipo === 'parada' ? 'destructive' : 'default'}
          >
            {loading ? 'Processando...' : `Confirmar ${tipo === 'pausa' ? 'Pausa' : 'Parada'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
