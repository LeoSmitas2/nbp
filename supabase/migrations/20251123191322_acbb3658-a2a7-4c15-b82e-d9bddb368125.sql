-- Criar bucket para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('produto-fotos', 'produto-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna foto_url na tabela produtos
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS foto_url text;

-- Políticas de storage para fotos de produtos
CREATE POLICY "Admins podem fazer upload de fotos de produtos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'produto-fotos' AND
  has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Admins podem atualizar fotos de produtos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'produto-fotos' AND
  has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Admins podem deletar fotos de produtos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'produto-fotos' AND
  has_role(auth.uid(), 'ADMIN'::app_role)
);

CREATE POLICY "Fotos de produtos são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produto-fotos');