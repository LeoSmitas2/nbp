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

    // Usar API de screenshot gratuita (screenshotmachine.com free tier)
    // Alternativa: usar screenshot.rocks ou apiflash
    const screenshotUrl = `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(url)}&dimension=1024x768&format=png&delay=2000`;

    // Fazer requisição para obter o screenshot
    const response = await fetch(screenshotUrl);
    
    if (!response.ok) {
      throw new Error('Falha ao capturar screenshot');
    }

    // Converter para base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        screenshot: `data:image/png;base64,${base64}`,
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
