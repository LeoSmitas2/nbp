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

    // Scrappey API - https://wiki.scrappey.com/
    const scrappeyResponse = await fetch('https://publisher.scrappey.com/api/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cmd: 'request.get',
        url: url,
        screenshot: true,
        screenshotOptions: {
          fullPage: false,
          type: 'jpeg',
          quality: 80
        }
      })
    });

    console.log('Status da resposta Scrappey:', scrappeyResponse.status);

    if (!scrappeyResponse.ok) {
      const errorText = await scrappeyResponse.text();
      console.error('Erro na resposta Scrappey:', errorText);
      throw new Error(`Falha ao capturar screenshot com Scrappey: ${scrappeyResponse.status}`);
    }

    const scrappeyData = await scrappeyResponse.json();
    console.log('Resposta Scrappey recebida');

    // Scrappey retorna a sessão, agora precisamos buscar o screenshot
    if (!scrappeyData.session) {
      throw new Error('Sessão não retornada pela API');
    }

    // Buscar o screenshot da sessão
    const screenshotResponse = await fetch(`https://publisher.scrappey.com/api/v1?key=${apiKey}&cmd=screenshot.get&session=${scrappeyData.session}`);
    
    if (!screenshotResponse.ok) {
      throw new Error(`Falha ao obter screenshot: ${screenshotResponse.status}`);
    }

    const screenshotData = await screenshotResponse.json();
    
    if (!screenshotData.solution?.screenshot) {
      throw new Error('Screenshot não retornado pela API');
    }

    console.log('Screenshot capturado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        screenshot: screenshotData.solution.screenshot,
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
