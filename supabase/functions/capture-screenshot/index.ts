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

    console.log('Capturando screenshot de:', url);

    // Usar screenshot.rocks - API gratuita e confiável
    const screenshotApiUrl = `https://api.pikwy.com/web/?token=demo&url=${encodeURIComponent(url)}&width=1280&height=720&refresh=true`;

    console.log('Fazendo requisição para:', screenshotApiUrl);

    // Fazer requisição para obter o screenshot
    const response = await fetch(screenshotApiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Status da resposta:', response.status);

    if (!response.ok) {
      console.error('Erro na resposta:', await response.text());
      throw new Error(`Falha ao capturar screenshot: ${response.status}`);
    }

    // Converter para base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    console.log('Screenshot capturado com sucesso, tamanho:', arrayBuffer.byteLength, 'bytes');

    return new Response(
      JSON.stringify({ 
        success: true,
        screenshot: `data:image/jpeg;base64,${base64}`,
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
