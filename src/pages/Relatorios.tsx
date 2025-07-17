import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

type OsStatusData = {
  name: string;
  value: number;
  key: string;
};

const COLORS = {
  aberta: '#f97316',
  em_andamento: '#3b82f6',
  finalizada: '#22c55e',
  cancelada: '#ef4444',
  pausada: '#a16207',
};

const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function Relatorios() {
  const [osStatusData, setOsStatusData] = useState<OsStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOsStatusData();
  }, []);

  const fetchOsStatusData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('status');

    if (error) {
      console.error("Erro ao buscar dados para o relatório:", error);
    } else {
      const counts = data.reduce((acc, { status }) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const chartData = Object.entries(counts).map(([name, value]) => ({
        name: statusLabel(name),
        value,
        key: name,
      }));
      
      setOsStatusData(chartData);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize os dados e o desempenho da sua operação.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ordens de Serviço por Status</CardTitle>
            <CardDescription>Distribuição de todas as OSs por seu status atual.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={osStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {osStatusData.map((entry) => (
                      <Cell key={`cell-${entry.key}`} fill={COLORS[entry.key as keyof typeof COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} OS(s)`, 'Quantidade']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 