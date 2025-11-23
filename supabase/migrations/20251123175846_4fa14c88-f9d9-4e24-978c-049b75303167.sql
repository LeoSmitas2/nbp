-- Update profiles table to store lojas as JSONB array
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS nome_lojas_marketplace,
ADD COLUMN lojas_marketplaces JSONB DEFAULT '[]'::jsonb;

-- Update handle_new_user function to handle the new structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert into profiles with all fields
  INSERT INTO public.profiles (id, email, name, empresa, cnpj, username, lojas_marketplaces)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'empresa',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'username',
    COALESCE((NEW.raw_user_meta_data->>'lojas_marketplaces')::jsonb, '[]'::jsonb)
  );
  
  -- Insert into user_roles with default CLIENT role and Pendente status
  INSERT INTO public.user_roles (user_id, role, status)
  VALUES (NEW.id, 'CLIENT', 'Pendente');
  
  RETURN NEW;
END;
$function$;