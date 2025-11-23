-- Adicionar novas colunas na tabela anuncios_monitorados
ALTER TABLE public.anuncios_monitorados
ADD COLUMN titulo_anuncio TEXT,
ADD COLUMN imagem TEXT,
ADD COLUMN vendas TEXT,
ADD COLUMN avaliacoes TEXT,
ADD COLUMN desconto NUMERIC DEFAULT 0,
ADD COLUMN preco_cheio NUMERIC DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.anuncios_monitorados.titulo_anuncio IS 'Título do anúncio extraído do marketplace';
COMMENT ON COLUMN public.anuncios_monitorados.imagem IS 'URL da imagem principal do produto no anúncio';
COMMENT ON COLUMN public.anuncios_monitorados.vendas IS 'Número de vendas do anúncio';
COMMENT ON COLUMN public.anuncios_monitorados.avaliacoes IS 'Avaliações do anúncio (quantidade e nota)';
COMMENT ON COLUMN public.anuncios_monitorados.desconto IS 'Percentual de desconto aplicado no anúncio';
COMMENT ON COLUMN public.anuncios_monitorados.preco_cheio IS 'Preço original antes do desconto';