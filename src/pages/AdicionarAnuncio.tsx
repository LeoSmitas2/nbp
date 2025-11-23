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
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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

interface DadosWebhook {
  preço: number;
  Titulo: string;
  vendas: string;
  Avaliações: string;
  "Vendido Por": string;
  imagem: string;
  ML: string;
  desconto: number;
  "preco cheio": number;
}

export default function AdicionarAnuncio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string>("");
  const [dadosWebhook, setDadosWebhook] = useState<DadosWebhook | null>(null);
  const [anuncioExistente, setAnuncioExistente] = useState<boolean>(false);
  const [url, setUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [marketplaceDetectado, setMarketplaceDetectado] = useState<string | null>(null);
  const [codigoMLB, setCodigoMLB] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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

  // Disparar webhook automaticamente quando tiver MLB
  useEffect(() => {
    const verificarEBuscarDados = async () => {
      if (codigoMLB && url) {
        // Verificar se já existe anúncio com este código
        const { data: anunciosExistentes, error } = await supabase
          .from("anuncios_monitorados")
          .select("id, url, produtos(nome)")
          .eq("codigo_marketplace", codigoMLB);

        console.log("Verificação de duplicata:", { codigoMLB, anunciosExistentes, error });

        if (!error && anunciosExistentes && anunciosExistentes.length > 0) {
          setAnuncioExistente(true);
          setDadosWebhook(null);
          setWebhookLoading(false);
          toast({
            title: "Anúncio já cadastrado",
            description: `Este anúncio já foi cadastrado ${anunciosExistentes.length} vez(es) anteriormente.`,
            variant: "destructive",
          });
        } else {
          setAnuncioExistente(false);
          buscarDadosWebhook();
        }
      } else {
        setDadosWebhook(null);
        setAnuncioExistente(false);
      }
    };

    verificarEBuscarDados();
  }, [codigoMLB]);

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

  const buscarDadosWebhook = async () => {
    if (!codigoMLB) return;

    setWebhookLoading(true);
    setWebhookStatus("Buscando informações do produto...");
    setDadosWebhook(null);

    try {
      const webhookResponse = await fetch(
        `https://automacao.nashbrasil.com.br/webhook-test/addanuncios?mlb=${encodeURIComponent(codigoMLB)}`,
        { method: "GET" }
      );

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        console.log("Resposta da webhook:", webhookData);

        // Verificar se é uma resposta assíncrona (workflow iniciado)
        if (webhookData.message === "Workflow was started") {
          setWebhookStatus("Processamento iniciado...");
          
          // Aguardar alguns segundos e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Tentar buscar novamente
          const retryResponse = await fetch(
            `https://automacao.nashbrasil.com.br/webhook-test/addanuncios?mlb=${encodeURIComponent(codigoMLB)}`,
            { method: "GET" }
          );
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log("Segunda tentativa:", retryData);
            
            if (Array.isArray(retryData) && retryData.length > 0 && retryData[0].data) {
              const data = retryData[0].data[0];
              setDadosWebhook(data);
              setWebhookStatus("");
              return;
            }
          }
          
          toast({
            title: "Processamento em andamento",
            description: "O sistema está processando os dados. Por favor, adicione o anúncio manualmente por enquanto.",
          });
          setWebhookStatus("");
          return;
        }

        // Verificar formato de resposta com array
        if (Array.isArray(webhookData) && webhookData.length > 0 && webhookData[0].data) {
          const data = webhookData[0].data[0];
          setDadosWebhook(data);
          setWebhookStatus("");
        } else {
          console.error("Formato de resposta inválido:", webhookData);
          toast({
            title: "Erro ao buscar dados",
            description: "O formato da resposta não é válido. Adicione o anúncio manualmente.",
          });
        }
      } else {
        toast({
          title: "Erro na webhook",
          description: "Não foi possível conectar ao serviço de dados.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar webhook:", error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível buscar os dados. Você pode adicionar o anúncio sem os dados automáticos.",
      });
    } finally {
      setWebhookLoading(false);
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

      // Inserir anúncio com dados da webhook (se disponíveis)
      const precoDetectado = dadosWebhook?.preço || 0;
      const novoStatus = precoDetectado > 0 && precoDetectado < produto.preco_minimo ? "Abaixo do mínimo" : "OK";
      
      const { error } = await supabase.from("anuncios_monitorados").insert({
        url: validatedData.url,
        produto_id: validatedData.produto_id,
        marketplace_id: marketplaceEncontrado.id,
        preco_detectado: precoDetectado,
        preco_minimo: produto.preco_minimo,
        origem: "Manual",
        status: novoStatus,
        cliente_id: null,
        codigo_marketplace: codigoMLB,
      });

      if (error) throw error;

      toast({
        title: "Anúncio adicionado com sucesso!",
        description: "O anúncio foi cadastrado no sistema.",
      });

      // Limpar formulário
      setUrl("");
      setProdutoId("");
      setDadosWebhook(null);
      setCodigoMLB(null);
      setMarketplaceDetectado(null);
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
                {anuncioExistente && codigoMLB && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Este anúncio já foi cadastrado anteriormente com o código {codigoMLB}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Não é possível adicionar anúncios duplicados.
                    </p>
                  </div>
                )}
              </div>

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

              {/* Indicador de progresso da webhook */}
              {webhookLoading && (
                <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-fade-in">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{webhookStatus}</span>
                    <span className="text-xs text-muted-foreground">Aguarde enquanto processamos os dados...</span>
                  </div>
                </div>
              )}

              {/* Dados retornados da webhook */}
              {dadosWebhook && !webhookLoading && (
                <div className="space-y-4 p-4 bg-card rounded-lg border animate-fade-in">
                  <div className="flex items-start gap-4">
                    {dadosWebhook.imagem && (
                      <img 
                        src={dadosWebhook.imagem} 
                        alt={dadosWebhook.Titulo}
                        className="w-24 h-24 object-cover rounded-md border"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">{dadosWebhook.Titulo}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Preço:</span>
                          <span className="ml-2 font-semibold text-primary">
                            R$ {dadosWebhook.preço.toFixed(2)}
                          </span>
                        </div>
                        {dadosWebhook["preco cheio"] > 0 && (
                          <div>
                            <span className="text-muted-foreground">Preço cheio:</span>
                            <span className="ml-2 line-through text-muted-foreground">
                              R$ {dadosWebhook["preco cheio"].toFixed(2)}
                            </span>
                          </div>
                        )}
                        {dadosWebhook.desconto > 0 && (
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {dadosWebhook.desconto}% OFF
                            </Badge>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Vendas:</span>
                          <span className="ml-2">{dadosWebhook.vendas}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avaliações:</span>
                          <span className="ml-2">{dadosWebhook.Avaliações}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vendedor:</span>
                          <span className="ml-2">{dadosWebhook["Vendido Por"]}</span>
                        </div>
                        {dadosWebhook.ML && (
                          <div className="col-span-2">
                            <Badge variant="outline" className="text-xs">
                              {dadosWebhook.ML}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {produtoId && (
                        <div className="pt-2 border-t">
                          {(() => {
                            const produto = produtos.find(p => p.id === produtoId);
                            if (!produto) return null;
                            const abaixoMinimo = dadosWebhook.preço < produto.preco_minimo;
                            return (
                              <div className={`flex items-center gap-2 text-sm ${abaixoMinimo ? 'text-destructive' : 'text-green-600'}`}>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>
                                  {abaixoMinimo 
                                    ? `⚠️ Preço abaixo do mínimo (R$ ${produto.preco_minimo.toFixed(2)})`
                                    : `✓ Preço dentro do permitido (mín: R$ ${produto.preco_minimo.toFixed(2)})`
                                  }
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading || webhookLoading || !marketplaceDetectado || anuncioExistente} 
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    "Adicionar Anúncio"
                  )}
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
