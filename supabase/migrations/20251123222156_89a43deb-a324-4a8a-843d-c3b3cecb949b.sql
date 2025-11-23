-- Add conta_marketplace_id to anuncios_monitorados
ALTER TABLE anuncios_monitorados 
ADD COLUMN conta_marketplace_id UUID REFERENCES contas_marketplace(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_anuncios_conta_marketplace ON anuncios_monitorados(conta_marketplace_id);