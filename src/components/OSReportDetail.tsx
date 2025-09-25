import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from './ui/button';
import { Printer, Download } from 'lucide-react';
import logo from '../assets/logo2.png';

interface OSReportDetailProps {
  osData: any;
  onPrint: () => void;
  onExportPDF: () => void;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string | null) =>
  dateString
    ? format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
    : 'N/A';

const formatDateTime = (dateString: string | null) =>
  dateString
    ? format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    : 'N/A';

const formatHoursToTime = (hours: number): string => {
  if (!hours || hours === 0) return '00:00:00';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor((totalMinutes % 60));
  const s = Math.floor(((totalMinutes % 60) - m) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function OSReportDetail({ osData, onPrint, onExportPDF }: OSReportDetailProps) {
  if (!osData) return null;

  const totalProdutos = osData.produtos.reduce(
    (total: number, produto: any) => total + (produto.subtotal || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Botões de Ação */}
      <div className="flex gap-2">
        <Button onClick={onPrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={onExportPDF} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Relatório Detalhado */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        {/* Cabeçalho */}
        <div className="text-center border-b pb-4 mb-6">
          <img src={logo} alt="Logo Metalma" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">ORDEM DE SERVIÇO</h1>
          <p className="text-lg text-gray-600">Nº {osData.numero_os}</p>
        </div>

        {/* Informações da OS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Dados da OS</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Número:</span> {osData.numero_os}</div>
              <div><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium status-${osData.status?.replace('_', '-')}`}>
                  {osData.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              </div>
              <div><span className="font-medium">Fábrica:</span> {osData.fabrica || 'N/A'}</div>
              <div><span className="font-medium">Data de Abertura:</span> {formatDateTime(osData.data_abertura)}</div>
              {osData.data_fim && (
                <div><span className="font-medium">Data de Finalização:</span> {formatDateTime(osData.data_fim)}</div>
              )}
              <div><span className="font-medium">Tempo Previsto:</span> {formatHoursToTime(osData.tempo_execucao_previsto || 0)}</div>
              <div><span className="font-medium">Tempo Real:</span> {formatHoursToTime(osData.tempo_execucao_real || 0)}</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Dados do Cliente</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Nome:</span> {osData.cliente?.nome || 'N/A'}</div>
              <div><span className="font-medium">CPF/CNPJ:</span> {osData.cliente?.cpf_cnpj || 'N/A'}</div>
              <div><span className="font-medium">Telefone:</span> {osData.cliente?.telefone || 'N/A'}</div>
              <div><span className="font-medium">Email:</span> {osData.cliente?.email || 'N/A'}</div>
              <div><span className="font-medium">Endereço:</span> {osData.cliente?.endereco || 'N/A'}</div>
              <div><span className="font-medium">Cidade/UF:</span> {osData.cliente?.cidade || 'N/A'} / {osData.cliente?.estado || 'N/A'}</div>
              <div><span className="font-medium">CEP:</span> {osData.cliente?.cep || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Descrição dos Serviços */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Descrição dos Serviços</h3>
          <div className="bg-gray-50 p-4 rounded border">
            <p className="text-sm whitespace-pre-wrap">{osData.descricao}</p>
          </div>
        </div>

        {/* Produtos */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Produtos Utilizados</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Produto</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Descrição</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Qtd.</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Unidade</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Valor Unit.</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {osData.produtos.map((produto: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{produto.produtos?.nome || 'N/A'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{produto.produtos?.descricao || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{produto.quantidade}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{produto.produtos?.unidade || 'UN'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(produto.preco_unitario)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">{formatCurrency(produto.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Resumo Financeiro</h3>
          <div className="bg-gray-50 p-4 rounded border">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Valor Total:</span>
                <span className="text-lg font-bold">{formatCurrency(totalProdutos)}</span>
              </div>
              {osData.desconto_valor && osData.desconto_valor > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Desconto:</span>
                  <span className="text-lg font-bold text-red-600">
                    {osData.desconto_tipo === 'percentual' 
                      ? `${((osData.desconto_valor / totalProdutos) * 100).toFixed(2)}%`
                      : formatCurrency(osData.desconto_valor)
                    }
                  </span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total com Desconto:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(osData.valor_total_com_desconto || totalProdutos)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colaboradores */}
        {osData.colaboradores.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Colaboradores Envolvidos</h3>
            <div className="flex flex-wrap gap-2">
              {osData.colaboradores.map((colab: any, index: number) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {colab.colaborador?.nome || 'N/A'}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* Observações */}
        {osData.observacoes && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Observações</h3>
            <div className="bg-gray-50 p-4 rounded border">
              <p className="text-sm whitespace-pre-wrap">{osData.observacoes}</p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center mt-8 pt-4 border-t text-xs text-gray-500">
          <p>Metalma Inox & Cia - Sistema de Controle de OS</p>
          <p>Relatório gerado em: {formatDateTime(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  );
}
