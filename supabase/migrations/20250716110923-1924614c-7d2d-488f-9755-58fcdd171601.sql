-- Criação das tabelas principais do sistema de controle de OS

-- Tabela de Administradores/Usuários
CREATE TABLE public.admins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(20) DEFAULT 'admin' CHECK (tipo_usuario IN ('admin', 'colaborador')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Clientes
CREATE TABLE public.clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(100),
    endereco TEXT,
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Colaboradores (com campos de horas e salário)
CREATE TABLE public.colaboradores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(100),
    endereco TEXT,
    cargo VARCHAR(50),
    salario DECIMAL(10,2),
    horas_trabalhadas DECIMAL(8,2) DEFAULT 0,
    meta_hora DECIMAL(8,2) DEFAULT 0,
    paradas_material INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    data_admissao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Produtos (com percentual global)
CREATE TABLE public.produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco_unitario DECIMAL(10,2) NOT NULL,
    estoque INTEGER DEFAULT 0,
    unidade VARCHAR(10) DEFAULT 'UN',
    percentual_global DECIMAL(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Ordens de Serviço
CREATE TABLE public.ordens_servico (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_os VARCHAR(20) UNIQUE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id),
    descricao TEXT NOT NULL,
    valor_total DECIMAL(10,2),
    custo_producao DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'pausada', 'finalizada', 'cancelada', 'falta_material')),
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT now(),
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    tempo_execucao_previsto DECIMAL(8,2),
    tempo_execucao_real DECIMAL(8,2) DEFAULT 0,
    tempo_pausa DECIMAL(8,2) DEFAULT 0,
    tempo_falta_material DECIMAL(8,2) DEFAULT 0,
    motivo_parada TEXT,
    prioridade VARCHAR(10) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    observacoes TEXT,
    meta_hora DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Colaboradores por OS
CREATE TABLE public.os_colaboradores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id),
    horas_trabalhadas DECIMAL(8,2) DEFAULT 0,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Produtos por OS
CREATE TABLE public.os_produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id),
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Controle de Tempo das OS
CREATE TABLE public.os_tempo (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id),
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    tipo VARCHAR(20) DEFAULT 'trabalho' CHECK (tipo IN ('trabalho', 'pausa', 'parada_material')),
    motivo TEXT,
    horas_calculadas DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Retrabalho
CREATE TABLE public.retrabalhos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id UUID REFERENCES public.ordens_servico(id),
    colaborador_id UUID REFERENCES public.colaboradores(id),
    motivo TEXT NOT NULL,
    horas_abatidas DECIMAL(8,2) NOT NULL,
    data_retrabalho TIMESTAMP WITH TIME ZONE DEFAULT now(),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Configurações globais do sistema
CREATE TABLE public.configuracoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT,
    descricao TEXT,
    tipo VARCHAR(20) DEFAULT 'string',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_tempo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrabalhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Create policies (permitir acesso para usuários autenticados)
CREATE POLICY "Authenticated users can view all records" ON public.admins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.admins FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.clientes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.colaboradores FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.produtos FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.ordens_servico FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.os_colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.os_colaboradores FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.os_produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.os_produtos FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.os_tempo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.os_tempo FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.retrabalhos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.retrabalhos FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all records" ON public.configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage all records" ON public.configuracoes FOR ALL TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment tempo_falta_material
CREATE OR REPLACE FUNCTION public.increment_tempo_falta_material(os_id UUID)
RETURNS numeric AS $$
BEGIN
    UPDATE public.ordens_servico
    SET tempo_falta_material = COALESCE(tempo_falta_material, 0) + 1
    WHERE id = os_id;
    RETURN COALESCE((SELECT tempo_falta_material FROM public.ordens_servico WHERE id = os_id), 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to increment paradas_material
CREATE OR REPLACE FUNCTION public.increment_paradas_material(colaborador_id UUID)
RETURNS integer AS $$
BEGIN
    UPDATE public.colaboradores
    SET paradas_material = COALESCE(paradas_material, 0) + 1
    WHERE id = colaborador_id;
    RETURN COALESCE((SELECT paradas_material FROM public.colaboradores WHERE id = colaborador_id), 0);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaboradores_updated_at
    BEFORE UPDATE ON public.colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordens_servico_updated_at
    BEFORE UPDATE ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial configurations
INSERT INTO public.configuracoes (chave, valor, descricao, tipo) VALUES
('percentual_global_produtos', '0', 'Percentual global aplicado a todos os produtos', 'decimal'),
('meta_hora_padrao', '8', 'Meta de horas padrão por colaborador', 'decimal'),
('prefixo_os', 'OS', 'Prefixo para numeração das ordens de serviço', 'string');

-- Generate automatic OS numbers function
CREATE OR REPLACE FUNCTION public.generate_os_number()
RETURNS TRIGGER AS $$
DECLARE
    prefixo TEXT;
    proximo_numero INTEGER;
    numero_completo TEXT;
    ano_atual TEXT;
BEGIN
    -- Get prefix from configurations
    SELECT valor INTO prefixo FROM public.configuracoes WHERE chave = 'prefixo_os';
    IF prefixo IS NULL THEN
        prefixo := 'OS';
    END IF;
    
    -- Get current year
    ano_atual := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get next number for the current year
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_os FROM LENGTH(prefixo) + 1 FOR POSITION('/' IN numero_os) - LENGTH(prefixo) - 1) AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM public.ordens_servico
    WHERE numero_os LIKE prefixo || '%/' || ano_atual;
    
    -- Format: OS0001/2024
    numero_completo := prefixo || LPAD(proximo_numero::TEXT, 4, '0') || '/' || ano_atual;
    
    -- Set the generated number
    NEW.numero_os := numero_completo;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS generate_os_number_trigger ON public.ordens_servico;

-- Create trigger for automatic OS number generation
CREATE TRIGGER generate_os_number_trigger
    BEFORE INSERT ON public.ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_os_number();