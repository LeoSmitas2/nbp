import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookResponse {
  mlb: string;
  preco?: number;
  titulo?: string;
  status?: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Recebendo resposta do webhook...');
    
    const webhookData: WebhookResponse = await req.json();
    console.log('Dados recebidos:', webhookData);

    // Validar dados obrigatórios
    if (!webhookData.mlb) {
      return new Response(
        JSON.stringify({ error: 'MLB é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar anúncio pelo código MLB
    const { data: anuncio, error: fetchError } = await supabase
      .from('anuncios_monitorados')
      .select('*')
      .eq('codigo_marketplace', webhookData.mlb)
      .single();

    if (fetchError || !anuncio) {
      console.error('Erro ao buscar anúncio:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Anúncio não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Anúncio encontrado:', anuncio.id);

    // Preparar dados para atualização
    const updateData: any = {
      ultima_atualizacao: new Date().toISOString(),
    };

    // Atualizar preço detectado se fornecido
    if (webhookData.preco !== undefined && webhookData.preco !== null) {
      updateData.preco_detectado = webhookData.preco;
      
      // Atualizar status baseado no preço mínimo
      if (webhookData.preco < anuncio.preco_minimo) {
        updateData.status = 'Abaixo do mínimo';
      } else {
        updateData.status = 'OK';
      }
    }

    // Atualizar anúncio no banco
    const { error: updateError } = await supabase
      .from('anuncios_monitorados')
      .update(updateData)
      .eq('id', anuncio.id);

    if (updateError) {
      console.error('Erro ao atualizar anúncio:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar anúncio' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Anúncio atualizado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Anúncio atualizado com sucesso',
        anuncio_id: anuncio.id,
        updated_fields: updateData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
