-- 🔖 Migração para configurar políticas RLS na tabela parcelas
-- A coluna user_id já existe, apenas configurando as políticas de segurança

-- Habilitar RLS na tabela parcelas (se não estiver habilitado)
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can manage own installments" ON public.parcelas;

-- Criar política RLS para parcelas
CREATE POLICY "Users can manage own installments" ON public.parcelas 
FOR ALL USING (auth.uid() = user_id);

-- Criar índice para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id ON public.parcelas(user_id);

-- Verificar se existem parcelas sem user_id e preencher se necessário
UPDATE public.parcelas 
SET user_id = (
  SELECT c.user_id 
  FROM public.contas c 
  WHERE c.id = parcelas.conta_id
)
WHERE user_id IS NULL;

-- Comentário
COMMENT ON COLUMN public.parcelas.user_id IS 'ID do usuário proprietário da parcela (segurança RLS)';
