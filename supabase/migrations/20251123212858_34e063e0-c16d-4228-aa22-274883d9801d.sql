-- Adicionar coluna vendedor na tabela anuncios_monitorados
ALTER TABLE public.anuncios_monitorados
ADD COLUMN vendedor TEXT;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.anuncios_monitorados.vendedor IS 'Nome do vendedor do anúncio no marketplace';