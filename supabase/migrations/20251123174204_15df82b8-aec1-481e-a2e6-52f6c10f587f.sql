-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'CLIENT');

-- Create enum for user status
CREATE TYPE public.user_status AS ENUM ('Pendente', 'Aprovado', 'Rejeitado');

-- Create enum for complaint status
CREATE TYPE public.complaint_status AS ENUM ('Solicitada', 'Em andamento', 'Resolvida');

-- Create enum for ad status
CREATE TYPE public.ad_status AS ENUM ('OK', 'Abaixo do mínimo');

-- Create enum for ad origin
CREATE TYPE public.ad_origin AS ENUM ('Denúncia', 'Manual');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  empresa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'CLIENT',
  status user_status NOT NULL DEFAULT 'Pendente',
  UNIQUE(user_id, role)
);

-- Create produtos table
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  preco_minimo DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create marketplaces table
CREATE TABLE public.marketplaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  url_base TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create denuncias table
CREATE TABLE public.denuncias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES public.marketplaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  preco_informado DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  status complaint_status NOT NULL DEFAULT 'Solicitada',
  comentario_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create anuncios_monitorados table
CREATE TABLE public.anuncios_monitorados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES public.marketplaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  preco_detectado DECIMAL(10,2) NOT NULL,
  preco_minimo DECIMAL(10,2) NOT NULL,
  cliente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  origem ad_origin NOT NULL,
  status ad_status NOT NULL,
  ultima_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios_monitorados ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND status = 'Aprovado'
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  
  -- Insert into user_roles with default CLIENT role and Pendente status
  INSERT INTO public.user_roles (user_id, role, status)
  VALUES (NEW.id, 'CLIENT', 'Pendente');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for produtos
CREATE POLICY "Approved users can view produtos"
  ON public.produtos FOR SELECT
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage produtos"
  ON public.produtos FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for marketplaces
CREATE POLICY "Approved users can view marketplaces"
  ON public.marketplaces FOR SELECT
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage marketplaces"
  ON public.marketplaces FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for denuncias
CREATE POLICY "Clients can view own denuncias"
  ON public.denuncias FOR SELECT
  USING (auth.uid() = cliente_id AND public.is_approved(auth.uid()));

CREATE POLICY "Clients can create denuncias"
  ON public.denuncias FOR INSERT
  WITH CHECK (auth.uid() = cliente_id AND public.is_approved(auth.uid()));

CREATE POLICY "Admins can view all denuncias"
  ON public.denuncias FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can update denuncias"
  ON public.denuncias FOR UPDATE
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for anuncios_monitorados
CREATE POLICY "Clients can view own anuncios"
  ON public.anuncios_monitorados FOR SELECT
  USING (
    (auth.uid() = cliente_id OR cliente_id IS NULL)
    AND public.is_approved(auth.uid())
  );

CREATE POLICY "Admins can view all anuncios"
  ON public.anuncios_monitorados FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can manage anuncios"
  ON public.anuncios_monitorados FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'));