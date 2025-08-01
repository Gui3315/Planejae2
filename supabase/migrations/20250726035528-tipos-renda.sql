-- Criar tabela de tipos de renda
CREATE TABLE public.tipos_renda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela tipos_renda
ALTER TABLE public.tipos_renda ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tipos_renda
CREATE POLICY "Users can manage own income types" ON public.tipos_renda FOR ALL USING (auth.uid() = user_id);

-- Aplicar trigger de updated_at na tabela tipos_renda
CREATE TRIGGER update_tipos_renda_updated_at BEFORE UPDATE ON public.tipos_renda FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remover campo salario_mensal da tabela profiles (não será mais usado)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS salario_mensal; 