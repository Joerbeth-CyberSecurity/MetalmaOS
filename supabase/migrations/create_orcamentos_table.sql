-- Criação da tabela de Orçamentos
-- Data: Janeiro 2025

-- Tabela de Orçamentos
CREATE TABLE public.orcamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_orcamento VARCHAR(20) UNIQUE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id),
    descricao TEXT NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    percentual_aplicado DECIMAL(5,2) DEFAULT 0,
    valor_final DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'aprovado', 'rejeitado', 'transformado')),
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT now(),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_vencimento TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Produtos por Orçamento
CREATE TABLE public.orcamento_produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id),
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_produtos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view all orcamentos" ON public.orcamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all orcamentos" ON public.orcamentos FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all orcamento_produtos" ON public.orcamento_produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all orcamento_produtos" ON public.orcamento_produtos FOR ALL TO authenticated USING (true);

-- Create triggers para update_updated_at
CREATE TRIGGER update_orcamentos_updated_at
    BEFORE UPDATE ON public.orcamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes para melhorar performance
CREATE INDEX idx_orcamentos_cliente_id ON public.orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX idx_orcamentos_data_abertura ON public.orcamentos(data_abertura);
CREATE INDEX idx_orcamento_produtos_orcamento_id ON public.orcamento_produtos(orcamento_id);
CREATE INDEX idx_orcamento_produtos_produto_id ON public.orcamento_produtos(produto_id);

-- Função para calcular valor_final automaticamente
CREATE OR REPLACE FUNCTION public.calculate_orcamento_valor_final()
RETURNS TRIGGER AS $$
BEGIN
    NEW.valor_final = NEW.valor_total * (1 + COALESCE(NEW.percentual_aplicado, 0) / 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular valor_final automaticamente
CREATE TRIGGER calculate_orcamento_valor_final_trigger
    BEFORE INSERT OR UPDATE ON public.orcamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_orcamento_valor_final();

-- Função para gerar número único de orçamento
CREATE OR REPLACE FUNCTION public.generate_orcamento_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    last_number INTEGER;
    new_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Buscar o último número do ano atual
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_orcamento FROM 'ORC(\d+)') AS INTEGER)), 0)
    INTO last_number
    FROM public.orcamentos
    WHERE numero_orcamento LIKE 'ORC%/' || current_year;
    
    -- Gerar novo número
    new_number := 'ORC' || LPAD((last_number + 1)::TEXT, 4, '0') || '/' || current_year;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Inserir configuração para próxima OS (se não existir)
INSERT INTO public.configuracoes (chave, valor, descricao) 
VALUES ('proxima_orcamento', 'ORC0001/2025', 'Próximo número de orçamento a ser gerado')
ON CONFLICT (chave) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE public.orcamentos IS 'Tabela de orçamentos do sistema';
COMMENT ON TABLE public.orcamento_produtos IS 'Produtos associados aos orçamentos';

COMMENT ON COLUMN public.orcamentos.numero_orcamento IS 'Número único do orçamento';
COMMENT ON COLUMN public.orcamentos.cliente_id IS 'ID do cliente';
COMMENT ON COLUMN public.orcamentos.descricao IS 'Descrição do orçamento';
COMMENT ON COLUMN public.orcamentos.valor_total IS 'Valor total dos produtos';
COMMENT ON COLUMN public.orcamentos.percentual_aplicado IS 'Percentual de ajuste aplicado';
COMMENT ON COLUMN public.orcamentos.valor_final IS 'Valor final após aplicar percentual';
COMMENT ON COLUMN public.orcamentos.status IS 'Status do orçamento';
COMMENT ON COLUMN public.orcamentos.data_abertura IS 'Data de abertura do orçamento';
COMMENT ON COLUMN public.orcamentos.data_aprovacao IS 'Data de aprovação do orçamento';
COMMENT ON COLUMN public.orcamentos.data_vencimento IS 'Data de vencimento do orçamento';
COMMENT ON COLUMN public.orcamentos.observacoes IS 'Observações adicionais';

COMMENT ON COLUMN public.orcamento_produtos.orcamento_id IS 'ID do orçamento';
COMMENT ON COLUMN public.orcamento_produtos.produto_id IS 'ID do produto';
COMMENT ON COLUMN public.orcamento_produtos.quantidade IS 'Quantidade do produto';
COMMENT ON COLUMN public.orcamento_produtos.preco_unitario IS 'Preço unitário do produto';
COMMENT ON COLUMN public.orcamento_produtos.subtotal IS 'Subtotal (quantidade * preço unitário)';
