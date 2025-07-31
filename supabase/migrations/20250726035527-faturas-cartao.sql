-- 🔖 Migração para Sistema de Controle de Faturas
-- Criar tabelas para faturas de cartão e pagamentos

-- 🔖 Tabela de faturas de cartão
CREATE TABLE IF NOT EXISTS public.faturas_cartao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cartao_id UUID NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020),
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_pago DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_restante DECIMAL(10,2) NOT NULL DEFAULT 0,
    data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'parcial', 'atrasada')),
    juros_aplicados DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 🔖 Garantir que não há faturas duplicadas para o mesmo cartão/mês/ano
    UNIQUE(cartao_id, mes, ano)
);

-- 🔖 Tabela de pagamentos de faturas
CREATE TABLE IF NOT EXISTS public.pagamentos_fatura (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fatura_id UUID NOT NULL REFERENCES public.faturas_cartao(id) ON DELETE CASCADE,
    valor_pago DECIMAL(10,2) NOT NULL,
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo_pagamento TEXT NOT NULL CHECK (tipo_pagamento IN ('total', 'parcial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔖 Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 🔖 Trigger para atualizar updated_at na tabela faturas_cartao
CREATE TRIGGER update_faturas_cartao_updated_at 
    BEFORE UPDATE ON public.faturas_cartao 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 🔖 RLS (Row Level Security) para faturas_cartao
ALTER TABLE public.faturas_cartao ENABLE ROW LEVEL SECURITY;

-- 🔖 Política para usuários verem apenas suas faturas
CREATE POLICY "Usuários podem ver suas próprias faturas" ON public.faturas_cartao
    FOR SELECT USING (auth.uid() = user_id);

-- 🔖 Política para usuários inserirem suas próprias faturas
CREATE POLICY "Usuários podem inserir suas próprias faturas" ON public.faturas_cartao
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 🔖 Política para usuários atualizarem suas próprias faturas
CREATE POLICY "Usuários podem atualizar suas próprias faturas" ON public.faturas_cartao
    FOR UPDATE USING (auth.uid() = user_id);

-- 🔖 Política para usuários deletarem suas próprias faturas
CREATE POLICY "Usuários podem deletar suas próprias faturas" ON public.faturas_cartao
    FOR DELETE USING (auth.uid() = user_id);

-- 🔖 RLS (Row Level Security) para pagamentos_fatura
ALTER TABLE public.pagamentos_fatura ENABLE ROW LEVEL SECURITY;

-- 🔖 Política para usuários verem pagamentos de suas faturas
CREATE POLICY "Usuários podem ver pagamentos de suas faturas" ON public.pagamentos_fatura
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.faturas_cartao 
            WHERE faturas_cartao.id = pagamentos_fatura.fatura_id 
            AND faturas_cartao.user_id = auth.uid()
        )
    );

-- 🔖 Política para usuários inserirem pagamentos de suas faturas
CREATE POLICY "Usuários podem inserir pagamentos de suas faturas" ON public.pagamentos_fatura
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.faturas_cartao 
            WHERE faturas_cartao.id = pagamentos_fatura.fatura_id 
            AND faturas_cartao.user_id = auth.uid()
        )
    );

-- 🔖 Política para usuários atualizarem pagamentos de suas faturas
CREATE POLICY "Usuários podem atualizar pagamentos de suas faturas" ON public.pagamentos_fatura
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.faturas_cartao 
            WHERE faturas_cartao.id = pagamentos_fatura.fatura_id 
            AND faturas_cartao.user_id = auth.uid()
        )
    );

-- 🔖 Política para usuários deletarem pagamentos de suas faturas
CREATE POLICY "Usuários podem deletar pagamentos de suas faturas" ON public.pagamentos_fatura
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.faturas_cartao 
            WHERE faturas_cartao.id = pagamentos_fatura.fatura_id 
            AND faturas_cartao.user_id = auth.uid()
        )
    );

-- 🔖 Índices para melhor performance
CREATE INDEX idx_faturas_cartao_user_id ON public.faturas_cartao(user_id);
CREATE INDEX idx_faturas_cartao_cartao_id ON public.faturas_cartao(cartao_id);
CREATE INDEX idx_faturas_cartao_status ON public.faturas_cartao(status);
CREATE INDEX idx_faturas_cartao_data_vencimento ON public.faturas_cartao(data_vencimento);
CREATE INDEX idx_pagamentos_fatura_fatura_id ON public.pagamentos_fatura(fatura_id);
CREATE INDEX idx_pagamentos_fatura_data_pagamento ON public.pagamentos_fatura(data_pagamento); 