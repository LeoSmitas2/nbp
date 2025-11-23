import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('SCRAPPEY_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key do Scrappey não configurada. Configure SCRAPPEY_API_KEY nos secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Capturando screenshot com Scrappey de:', url);

    // Scrappey API - A chave vai na URL como query parameter
    const scrappeyEndpoint = `https://publisher.scrappey.com/api/v1?key=${apiKey}`;
    
    const scrappeyResponse = await fetch(scrappeyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cmd: 'request.get',
        url: url,
        screenshot: true,
        screenshotWidth: 1280,
        screenshotHeight: 720,
        fullPage: false
      })
    });

    console.log('Status da resposta Scrappey:', scrappeyResponse.status);

    if (!scrappeyResponse.ok) {
      const errorText = await scrappeyResponse.text();
      console.error('Erro na resposta Scrappey:', errorText);
      throw new Error(`Falha ao capturar screenshot com Scrappey: ${scrappeyResponse.status} - ${errorText}`);
    }

    const scrappeyData = await scrappeyResponse.json();
    console.log('Resposta Scrappey recebida');

    // Verificar se o screenshot está na resposta
    if (!scrappeyData.solution?.screenshot) {
      console.error('Screenshot não encontrado na resposta:', JSON.stringify(scrappeyData));
      throw new Error('Screenshot não retornado pela API');
    }

    const screenshotBase64 = scrappeyData.solution.screenshot;
    console.log('Screenshot capturado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        screenshot: screenshotBase64.startsWith('data:') ? screenshotBase64 : `data:image/jpeg;base64,${screenshotBase64}`,
        message: 'Screenshot capturado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro ao capturar screenshot:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao capturar screenshot',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
