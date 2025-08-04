-- Criar tabela de compras recorrentes no cartão de crédito
CREATE TABLE public.compras_recorrentes_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id),
  dia_cobranca INTEGER DEFAULT 1 CHECK (dia_cobranca >= 1 AND dia_cobranca <= 31), -- Dia do mês que é cobrado
  ativa BOOLEAN DEFAULT true,
  data_inicio DATE NOT NULL,
  data_fim DATE, -- NULL = indefinida, quando preenchida = pausa a partir desta data
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na nova tabela
ALTER TABLE public.compras_recorrentes_cartao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para compras recorrentes
CREATE POLICY "Users can manage own recurring purchases" ON public.compras_recorrentes_cartao FOR ALL USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_compras_recorrentes_cartao_user_id ON public.compras_recorrentes_cartao(user_id);
CREATE INDEX idx_compras_recorrentes_cartao_cartao_id ON public.compras_recorrentes_cartao(cartao_id);
CREATE INDEX idx_compras_recorrentes_cartao_ativa ON public.compras_recorrentes_cartao(ativa);
