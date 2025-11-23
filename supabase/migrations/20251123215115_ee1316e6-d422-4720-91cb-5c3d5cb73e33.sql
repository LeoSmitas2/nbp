-- Permitir cliente_id nulo em contas_marketplace
ALTER TABLE public.contas_marketplace 
ALTER COLUMN cliente_id DROP NOT NULL;

-- Atualizar política para permitir que admins criem contas sem cliente
DROP POLICY IF EXISTS "Clientes podem inserir suas próprias contas" ON public.contas_marketplace;

CREATE POLICY "Clientes podem inserir suas próprias contas"
ON public.contas_marketplace
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = cliente_id AND is_approved(auth.uid()))
  OR (cliente_id IS NULL AND is_approved(auth.uid()))
);