-- Adicionar coluna codigo_denuncia
ALTER TABLE public.denuncias 
ADD COLUMN codigo_denuncia TEXT UNIQUE;

-- Função para gerar código alfanumérico único
CREATE OR REPLACE FUNCTION public.gerar_codigo_denuncia()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    -- Gerar código no formato DEN-XXXXXX (6 caracteres alfanuméricos)
    novo_codigo := 'DEN-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM denuncias WHERE codigo_denuncia = novo_codigo) INTO existe;
    
    -- Se não existe, retornar o código
    IF NOT existe THEN
      RETURN novo_codigo;
    END IF;
  END LOOP;
END;
$$;

-- Trigger para gerar código automaticamente
CREATE OR REPLACE FUNCTION public.set_codigo_denuncia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_denuncia IS NULL THEN
    NEW.codigo_denuncia := gerar_codigo_denuncia();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_codigo_denuncia
BEFORE INSERT ON public.denuncias
FOR EACH ROW
EXECUTE FUNCTION public.set_codigo_denuncia();

-- Gerar códigos para denúncias existentes
UPDATE public.denuncias
SET codigo_denuncia = gerar_codigo_denuncia()
WHERE codigo_denuncia IS NULL;

-- Tornar a coluna NOT NULL após preencher os existentes
ALTER TABLE public.denuncias
ALTER COLUMN codigo_denuncia SET NOT NULL;