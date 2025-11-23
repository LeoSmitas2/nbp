-- Adicionar campo para armazenar código do marketplace (ex: MLB-1234567890)
ALTER TABLE public.anuncios_monitorados 
ADD COLUMN codigo_marketplace TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.anuncios_monitorados.codigo_marketplace IS 'Código identificador do anúncio no marketplace (ex: MLB-1234567890 para Mercado Livre)';