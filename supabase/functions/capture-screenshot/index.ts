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

    // Usar screenshot.one - API gratuita confiável
    const screenshotApiUrl = new URL('https://api.screenshotone.com/take');
    screenshotApiUrl.searchParams.set('access_key', 'RJu0vfkD4sfKkA'); // chave demo pública
    screenshotApiUrl.searchParams.set('url', url);
    screenshotApiUrl.searchParams.set('viewport_width', '1280');
    screenshotApiUrl.searchParams.set('viewport_height', '720');
    screenshotApiUrl.searchParams.set('device_scale_factor', '1');
    screenshotApiUrl.searchParams.set('format', 'jpg');
    screenshotApiUrl.searchParams.set('image_quality', '80');
    screenshotApiUrl.searchParams.set('block_ads', 'true');
    screenshotApiUrl.searchParams.set('block_cookie_banners', 'true');
    screenshotApiUrl.searchParams.set('block_trackers', 'true');
    screenshotApiUrl.searchParams.set('delay', '3');

    console.log('Fazendo requisição para screenshot API');

    const response = await fetch(screenshotApiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      throw new Error(`Falha ao capturar screenshot: ${response.status} - ${errorText}`);
    }

    // Verificar se é uma imagem
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (!contentType?.includes('image')) {
      throw new Error('Resposta não é uma imagem válida');
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
