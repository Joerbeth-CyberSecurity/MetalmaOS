import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportTemplateProps {
  title: string;
  period: { start: string; end: string };
  children: React.ReactNode;
  type: string;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({
  title,
  period,
  children,
  type
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="print-container bg-white text-black p-8 max-w-none">
      {/* Cabeçalho da Empresa */}
      <div className="border-b-2 border-gray-300 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="Metalma Inox & Cia" 
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">METALMA INOX & CIA</h1>
              <p className="text-sm text-gray-600">Sistema de Controle de Ordens de Serviço</p>
              <p className="text-xs text-gray-500">Gestão Moderna e Eficiente</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Relatório Gerado em:</p>
            <p className="text-sm font-medium">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
          </div>
        </div>
      </div>

      {/* Título do Relatório */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-lg text-gray-600">
          Período: {formatDate(period.start)} a {formatDate(period.end)}
        </p>
      </div>

      {/* Conteúdo do Relatório */}
      <div className="report-content">
        {children}
      </div>

      {/* Rodapé */}
      <div className="border-t-2 border-gray-300 pt-4 mt-8">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <p>Metalma Inox & Cia - Sistema de Controle de OS</p>
            <p>Relatório: {type}</p>
          </div>
          <div className="text-right">
            <p>Página 1 de 1</p>
            <p>Gerado automaticamente pelo sistema</p>
          </div>
        </div>
      </div>

      {/* Estilos específicos para impressão */}
      <style>{`
        @media print {
          .print-container {
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .report-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          .report-content th,
          .report-content td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .report-content th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          
          .report-content .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          
          .status-aberta {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #f59e0b;
          }
          
          .status-em-andamento {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #3b82f6;
          }
          
          .status-finalizada {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #22c55e;
          }
          
          .status-cancelada {
            background-color: #fee2e2;
            color: #991b1b;
            border: 1px solid #ef4444;
          }
          
          .status-pausada {
            background-color: #fce4ec;
            color: #c2185b;
            border: 1px solid #e91e63;
          }
          
          .status-falta-material {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffc107;
          }
        }
      `}</style>
    </div>
  );
}; 