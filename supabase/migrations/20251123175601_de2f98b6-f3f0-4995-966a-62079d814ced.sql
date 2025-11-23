-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cnpj TEXT,
ADD COLUMN username TEXT,
ADD COLUMN nome_lojas_marketplace TEXT;

-- Add unique constraint on username if needed
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles(username) WHERE username IS NOT NULL;

-- Update handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert into profiles with all fields
  INSERT INTO public.profiles (id, email, name, empresa, cnpj, username, nome_lojas_marketplace)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'empresa',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'nome_lojas_marketplace'
  );
  
  -- Insert into user_roles with default CLIENT role and Pendente status
  INSERT INTO public.user_roles (user_id, role, status)
  VALUES (NEW.id, 'CLIENT', 'Pendente');
  
  RETURN NEW;
END;
$function$;