-- Criar tabela contas_marketplace
CREATE TABLE public.contas_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_conta TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar comentários para documentação
COMMENT ON TABLE public.contas_marketplace IS 'Contas dos clientes nos marketplaces';
COMMENT ON COLUMN public.contas_marketplace.nome_conta IS 'Nome da loja/conta no marketplace';
COMMENT ON COLUMN public.contas_marketplace.marketplace IS 'Nome do marketplace (ex: Mercado Livre, Shopee)';
COMMENT ON COLUMN public.contas_marketplace.cliente_id IS 'ID do cliente dono da conta';

-- Habilitar RLS
ALTER TABLE public.contas_marketplace ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem gerenciar todas as contas"
ON public.contas_marketplace
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Clientes podem ver suas próprias contas"
ON public.contas_marketplace
FOR SELECT
TO authenticated
USING (auth.uid() = cliente_id AND is_approved(auth.uid()));

CREATE POLICY "Clientes podem inserir suas próprias contas"
ON public.contas_marketplace
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = cliente_id AND is_approved(auth.uid()));

-- Migrar dados existentes da coluna lojas_marketplaces
INSERT INTO public.contas_marketplace (nome_conta, marketplace, cliente_id)
SELECT 
  (loja->>'nome')::TEXT as nome_conta,
  (loja->>'marketplace')::TEXT as marketplace,
  p.id as cliente_id
FROM public.profiles p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE 
    WHEN jsonb_typeof(p.lojas_marketplaces) = 'array' THEN p.lojas_marketplaces
    ELSE '[]'::jsonb
  END
) as loja
WHERE (loja->>'nome') IS NOT NULL 
  AND (loja->>'marketplace') IS NOT NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_contas_marketplace_cliente_id ON public.contas_marketplace(cliente_id);

-- Remover coluna antiga da tabela profiles
ALTER TABLE public.profiles DROP COLUMN lojas_marketplaces;

-- Atualizar função handle_new_user para não incluir mais lojas_marketplaces
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles without lojas_marketplaces
  INSERT INTO public.profiles (id, email, name, empresa, cnpj, username, telefone_contato, nome_contato)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'empresa',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'telefone_contato',
    NEW.raw_user_meta_data->>'nome_contato'
  );
  
  -- Insert into user_roles with default CLIENT role and Pendente status
  INSERT INTO public.user_roles (user_id, role, status)
  VALUES (NEW.id, 'CLIENT', 'Pendente');
  
  -- Insert contas_marketplace if provided
  IF NEW.raw_user_meta_data->'lojas_marketplaces' IS NOT NULL THEN
    INSERT INTO public.contas_marketplace (nome_conta, marketplace, cliente_id)
    SELECT 
      (loja->>'nome')::TEXT,
      (loja->>'marketplace')::TEXT,
      NEW.id
    FROM jsonb_array_elements(
      COALESCE(
        (NEW.raw_user_meta_data->'lojas_marketplaces')::jsonb,
        '[]'::jsonb
      )
    ) as loja
    WHERE (loja->>'nome') IS NOT NULL 
      AND (loja->>'marketplace') IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;