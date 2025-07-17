import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Esquema de validação
const configSchema = z.object({
  percentual_global_produtos: z.coerce.number().min(0, "O percentual não pode ser negativo."),
  meta_hora_padrao: z.coerce.number().min(0, "A meta de horas não pode ser negativa."),
  prefixo_os: z.string().min(1, "O prefixo é obrigatório."),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function Configuracoes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      percentual_global_produtos: 0,
      meta_hora_padrao: 0,
      prefixo_os: 'OS',
    },
  });

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('configuracoes').select('chave, valor');
    if (error) {
      toast({ title: "Erro ao buscar configurações", description: error.message, variant: "destructive" });
    } else {
      const configMap = data.reduce((acc, { chave, valor }) => {
        acc[chave] = valor;
        return acc;
      }, {} as Record<string, string>);
      
      form.reset({
        percentual_global_produtos: parseFloat(configMap.percentual_global_produtos || '0'),
        meta_hora_padrao: parseFloat(configMap.meta_hora_padrao || '0'),
        prefixo_os: configMap.prefixo_os || 'OS',
      });
    }
    setLoading(false);
  };

  const onSubmit = async (values: ConfigFormData) => {
    setIsSaving(true);
    
    const updates = Object.entries(values).map(([chave, valor]) => 
      supabase
        .from('configuracoes')
        .update({ valor: String(valor) })
        .eq('chave', chave)
    );

    const results = await Promise.all(updates);
    const hasError = results.some(res => res.error);

    if (hasError) {
      toast({ title: "Erro ao salvar configurações", description: "Uma ou mais configurações não puderam ser salvas.", variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Ajuste os parâmetros globais do sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Sistema</CardTitle>
          <CardDescription>Esses valores afetam diferentes partes do sistema. Use com cuidado.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="percentual_global_produtos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentual Global de Produtos (%)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meta_hora_padrao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de Horas Padrão (por colaborador)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="prefixo_os" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefixo para Ordens de Serviço</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 