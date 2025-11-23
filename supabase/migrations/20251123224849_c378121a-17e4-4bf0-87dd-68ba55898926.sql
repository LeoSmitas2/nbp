-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT false,
  denuncia_id UUID REFERENCES public.denuncias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notificacoes
FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON public.notificacoes
FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Admins podem criar notificações"
ON public.notificacoes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

-- Índice para performance
CREATE INDEX idx_notificacoes_usuario_id ON public.notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;