import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Camera } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const anuncioSchema = z.object({
  url: z.string().url("URL inválida").max(500, "URL muito longa"),
  produto_id: z.string().min(1, "Selecione um produto"),
});

interface Produto {
  id: string;
  nome: string;
  preco_minimo: number;
}

interface Marketplace {
  id: string;
  nome: string;
  url_base: string;
}

export default function AdicionarAnuncio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [marketplaceDetectado, setMarketplaceDetectado] = useState<string | null>(null);
  const [codigoMLB, setCodigoMLB] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturandoScreenshot, setCapturandoScreenshot] = useState(false);
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard-cliente");
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  useEffect(() => {
    detectarMarketplace();
    extrairCodigoMLB();
  }, [url]);

  const fetchData = async () => {
    try {
      const [produtosData, marketplacesData] = await Promise.all([
        supabase.from("produtos").select("id, nome, preco_minimo").eq("ativo", true).order("nome"),
        supabase.from("marketplaces").select("id, nome, url_base").eq("ativo", true).order("nome"),
      ]);

      setProdutos(produtosData.data || []);
      setMarketplaces(marketplacesData.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const detectarMarketplace = () => {
    if (!url) {
      setMarketplaceDetectado(null);
      return;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Encontrar marketplace que corresponde ao hostname
      const marketplaceEncontrado = marketplaces.find((marketplace) => {
        try {
          const baseUrl = new URL(marketplace.url_base);
          const baseHostname = baseUrl.hostname.toLowerCase();
          
          // Verifica se o hostname contém o domínio base do marketplace
          return hostname.includes(baseHostname.replace('www.', '')) || 
                 baseHostname.replace('www.', '').includes(hostname.replace('www.', ''));
        } catch {
          return false;
        }
      });

      setMarketplaceDetectado(marketplaceEncontrado?.nome || null);
    } catch {
      setMarketplaceDetectado(null);
    }
  };

  const extrairCodigoMLB = () => {
    if (!url) {
      setCodigoMLB(null);
      return;
    }

    try {
      // Procurar padrão MLB-XXXXXXXX na URL
      // O código pode estar em diferentes formatos:
      // - /MLB-1234567890-nome-produto
      // - /p/MLB1234567890
      // - ?item_id=MLB1234567890
      const regexPatterns = [
        /MLB-?(\d{10,})/i,  // MLB-1234567890 ou MLB1234567890
        /\/p\/MLB-?(\d{10,})/i, // /p/MLB1234567890
        /item_id=MLB-?(\d{10,})/i, // ?item_id=MLB1234567890
      ];

      for (const pattern of regexPatterns) {
        const match = url.match(pattern);
        if (match) {
          const codigo = `MLB-${match[1]}`;
          setCodigoMLB(codigo);
          return;
        }
      }

      setCodigoMLB(null);
    } catch {
      setCodigoMLB(null);
    }
  };

  const capturarScreenshot = async () => {
    if (!url) {
      toast({
        title: "URL necessária",
        description: "Informe uma URL válida antes de capturar o screenshot",
        variant: "destructive",
      });
      return;
    }

    setCapturandoScreenshot(true);
    setScreenshot(null);

    try {
      const { data, error } = await supabase.functions.invoke('capture-screenshot', {
        body: { url }
      });

      if (error) throw error;

      if (data?.screenshot) {
        setScreenshot(data.screenshot);
        toast({
          title: "Screenshot capturado!",
          description: "O screenshot foi obtido com sucesso",
        });
      }
    } catch (error: any) {
      console.error('Erro ao capturar screenshot:', error);
      toast({
        title: "Erro ao capturar screenshot",
        description: error.message || "Não foi possível capturar o screenshot da página",
        variant: "destructive",
      });
    } finally {
      setCapturandoScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validar dados
      const validatedData = anuncioSchema.parse({
        url,
        produto_id: produtoId,
      });

      // Encontrar marketplace pela URL
      const marketplaceEncontrado = marketplaces.find((marketplace) => {
        try {
          const urlObj = new URL(validatedData.url);
          const hostname = urlObj.hostname.toLowerCase();
          const baseUrl = new URL(marketplace.url_base);
          const baseHostname = baseUrl.hostname.toLowerCase();
          
          return hostname.includes(baseHostname.replace('www.', '')) || 
                 baseHostname.replace('www.', '').includes(hostname.replace('www.', ''));
        } catch {
          return false;
        }
      });

      if (!marketplaceEncontrado) {
        throw new Error("Não foi possível identificar o marketplace a partir da URL. Certifique-se de que o marketplace está cadastrado no sistema.");
      }

      // Buscar dados do produto
      const produto = produtos.find((p) => p.id === validatedData.produto_id);
      if (!produto) {
        throw new Error("Produto não encontrado");
      }

      // Inserir anúncio com preço detectado zerado (será atualizado posteriormente)
      const { error } = await supabase.from("anuncios_monitorados").insert({
        url: validatedData.url,
        produto_id: validatedData.produto_id,
        marketplace_id: marketplaceEncontrado.id,
        preco_detectado: 0,
        preco_minimo: produto.preco_minimo,
        origem: "Manual",
        status: "OK",
        cliente_id: null,
        codigo_marketplace: codigoMLB,
      });

      if (error) throw error;

      toast({
        title: "Anúncio adicionado com sucesso!",
        description: "O anúncio foi cadastrado no sistema.",
      });

      navigate("/gerenciar-anuncios");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Erro ao adicionar anúncio",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/gerenciar-anuncios")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Anúncio Monitorado</CardTitle>
            <CardDescription>
              Informe os dados do anúncio. O marketplace será detectado automaticamente pela URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Link do Anúncio *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://exemplo.com/produto/anuncio"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="text-base"
                />
                {errors.url && (
                  <p className="text-sm text-destructive">{errors.url}</p>
                )}
                {marketplaceDetectado && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Marketplace detectado:</span>
                    <Badge variant="secondary">{marketplaceDetectado}</Badge>
                    {codigoMLB && (
                      <>
                        <span>•</span>
                        <span>Código:</span>
                        <Badge variant="outline">{codigoMLB}</Badge>
                      </>
                    )}
                  </div>
                )}
                {url && !marketplaceDetectado && (
                  <p className="text-sm text-amber-600">
                    ⚠️ Marketplace não identificado. Verifique se a URL está correta e se o marketplace está cadastrado.
                  </p>
                )}
              </div>

              {url && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Pré-visualização do Link</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={capturarScreenshot}
                      disabled={capturandoScreenshot || !url}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {capturandoScreenshot ? "Capturando..." : "Capturar Screenshot"}
                    </Button>
                  </div>
                  
                  {screenshot ? (
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <div className="p-3 bg-muted/50 border-b">
                        <p className="text-xs text-muted-foreground truncate" title={url}>
                          {url}
                        </p>
                      </div>
                      <div className="relative w-full">
                        <img 
                          src={screenshot} 
                          alt="Screenshot do anúncio" 
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <div className="p-3 bg-muted/50 border-b">
                        <p className="text-xs text-muted-foreground truncate" title={url}>
                          {url}
                        </p>
                      </div>
                      <div className="relative w-full h-96">
                        <iframe
                          src={url}
                          className="w-full h-full"
                          sandbox="allow-same-origin"
                          title="Pré-visualização do anúncio"
                          onError={(e) => {
                            const iframe = e.currentTarget;
                            const parent = iframe.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                                  <div>
                                    <p class="mb-2">⚠️ Não foi possível carregar a pré-visualização</p>
                                    <p class="text-xs">O site não permite visualização em iframe</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {screenshot ? "Screenshot capturado da página" : "Pré-visualização do anúncio (alguns sites podem bloquear esta visualização)"}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="produto_id">Produto *</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger id="produto_id">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} (Preço mín: R$ {produto.preco_minimo.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.produto_id && (
                  <p className="text-sm text-destructive">{errors.produto_id}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading || !marketplaceDetectado} className="flex-1">
                  {loading ? "Adicionando..." : "Adicionar Anúncio"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/gerenciar-anuncios")}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
