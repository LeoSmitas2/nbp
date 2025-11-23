import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

export default function NovaDenuncia() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string>("");
  const [dadosWebhook, setDadosWebhook] = useState<DadosWebhook | null>(null);
  const [anuncioExistente, setAnuncioExistente] = useState<boolean>(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  
  const [url, setUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [marketplaceDetectado, setMarketplaceDetectado] = useState<string | null>(null);
  const [codigoMLB, setCodigoMLB] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [precoManual, setPrecoManual] = useState<string>("");

  useEffect(() => {
    fetchProdutos();
    fetchMarketplaces();
  }, []);

  useEffect(() => {
    detectarMarketplace();
    extrairCodigoMLB();
  }, [url]);

  // Disparar webhook automaticamente quando tiver código MLB
  useEffect(() => {
    const verificarEBuscarDados = async () => {
      if (codigoMLB && url) {
        // Verificar se já existe denúncia ativa com este código
        const { data: denunciasExistentes, error } = await supabase
          .from("denuncias")
          .select("id, url, status, produtos(nome)")
          .eq("url", url)
          .in("status", ["Solicitada", "Em andamento"]);

        if (!error && denunciasExistentes && denunciasExistentes.length > 0) {
          setAnuncioExistente(true);
          setDadosWebhook(null);
          setWebhookLoading(false);
          toast.error(`Já existe uma denúncia ativa para esta URL (Status: ${denunciasExistentes[0].status}).`);
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

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, preco_minimo")
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } else {
      setProdutos(data || []);
    }
  };

  const fetchMarketplaces = async () => {
    const { data, error } = await supabase
      .from("marketplaces")
      .select("id, nome, url_base")
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar marketplaces:", error);
      toast.error("Erro ao carregar marketplaces");
    } else {
      setMarketplaces(data || []);
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
      // Verificar se é Amazon
      const isAmazon = url.toLowerCase().includes('amazon');
      
      if (isAmazon) {
        // Procurar padrão ASIN da Amazon
        const asinPatterns = [
          /\/dp\/([A-Z0-9]{10})/i,
          /\/product\/([A-Z0-9]{10})/i,
          /\/gp\/product\/([A-Z0-9]{10})/i,
          /[?&]ASIN=([A-Z0-9]{10})/i,
          /\/(B[A-Z0-9]{9})/i,
        ];

        for (const pattern of asinPatterns) {
          const match = url.match(pattern);
          if (match && match[1].startsWith('B')) {
            setCodigoMLB(match[1].toUpperCase());
            return;
          }
        }
      } else {
        // Procurar padrão MLB para Mercado Livre
        const regexPatterns = [
          /MLB-?(\d{10,})/i,
          /\/p\/MLB-?(\d{10,})/i,
          /item_id=MLB-?(\d{10,})/i,
        ];

        for (const pattern of regexPatterns) {
          const match = url.match(pattern);
          if (match) {
            const codigo = `MLB-${match[1]}`;
            setCodigoMLB(codigo);
            return;
          }
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
      const params = new URLSearchParams({
        codigo: codigoMLB,
        url: url,
        marketplace: marketplaceDetectado || 'Desconhecido'
      });

      const webhookResponse = await fetch(
        `https://webhook.automacao.nashbrasil.com.br/webhook/addanuncios?${params.toString()}`,
        { method: "GET" }
      );

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        console.log("Resposta da webhook:", webhookData);

        // Verificar se é uma resposta assíncrona
        if (webhookData.message === "Workflow was started") {
          setWebhookStatus("Processamento iniciado...");
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const retryResponse = await fetch(
            `https://webhook.automacao.nashbrasil.com.br/webhook/addanuncios?${params.toString()}`,
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
          
          toast.info("Processamento em andamento. Você pode preencher os dados manualmente.");
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
          toast.info("Formato de resposta inválido. Preencha os dados manualmente.");
        }
      } else {
        toast.error("Não foi possível conectar ao serviço de dados.");
      }
    } catch (error) {
      console.error("Erro ao buscar webhook:", error);
      toast.info("Erro ao buscar dados automaticamente. Você pode preencher manualmente.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!url || !produtoId || !marketplaceDetectado) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Verificar se temos preço manual ou automático
    const precoManualNumerico = precoManual ? parseFloat(precoManual.replace(',', '.')) : 0;
    const precoAutomatico = dadosWebhook?.preço || 0;
    
    // Usar preço manual se informado, senão usar o automático
    const precoInformado = precoManualNumerico > 0 ? precoManualNumerico : precoAutomatico;
    
    if (!dadosWebhook && !precoManualNumerico) {
      toast.error("Informe o preço do anúncio ou aguarde a busca automática");
      return;
    }
    
    if (precoInformado <= 0) {
      toast.error("Preço informado inválido");
      return;
    }

    setLoading(true);

    try {
      // Encontrar marketplace ID
      const marketplace = marketplaces.find(m => m.nome === marketplaceDetectado);
      if (!marketplace) {
        throw new Error("Marketplace não encontrado");
      }

      const { error } = await supabase.from("denuncias").insert({
        cliente_id: user.id,
        produto_id: produtoId,
        marketplace_id: marketplace.id,
        url: url,
        preco_informado: precoInformado,
        observacoes: observacoes || null,
        status: "Solicitada",
      });

      if (error) throw error;

      toast.success("Denúncia registrada com sucesso!");
      
      // Reset form
      setUrl("");
      setProdutoId("");
      setObservacoes("");
      setPrecoManual("");
      setDadosWebhook(null);
      setCodigoMLB(null);
      setMarketplaceDetectado(null);

      // Navigate to minhas denuncias after 2 seconds
      setTimeout(() => {
        navigate("/minhas-denuncias");
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao registrar denúncia:", error);
      toast.error("Erro ao registrar denúncia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const produtoSelecionado = produtos.find(p => p.id === produtoId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard-cliente")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Nova Denúncia</CardTitle>
            <CardDescription>
              Reporte anúncios com preços abaixo do mínimo permitido. Os dados serão obtidos automaticamente.
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
                <p className="text-xs text-muted-foreground">
                  Cole o link completo do anúncio que deseja denunciar
                </p>
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
                    ⚠️ Marketplace não identificado. Verifique se a URL está correta.
                  </p>
                )}
                {anuncioExistente && codigoMLB && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Já existe uma denúncia ativa para esta URL
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Não é possível criar uma nova denúncia enquanto houver outra com status "Solicitada" ou "Em andamento".
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="produto">Produto *</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger id="produto">
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
                          <span className="ml-2 font-medium">{dadosWebhook["Vendido Por"]}</span>
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
                        <div className="pt-2 border-t space-y-3">
                          {(() => {
                            const produto = produtos.find(p => p.id === produtoId);
                            if (!produto) return null;
                            const abaixoMinimo = dadosWebhook.preço < produto.preco_minimo;
                            return (
                              <>
                                <div className={`flex items-center gap-2 text-sm ${abaixoMinimo ? 'text-destructive' : 'text-green-600'}`}>
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>
                                    {abaixoMinimo 
                                      ? `⚠️ Preço abaixo do mínimo (R$ ${produto.preco_minimo.toFixed(2)})`
                                      : `✓ Preço dentro do permitido (mín: R$ ${produto.preco_minimo.toFixed(2)})`
                                    }
                                  </span>
                                </div>
                                {!abaixoMinimo && (
                                  <div className="space-y-2">
                                    <Label htmlFor="preco-manual" className="text-sm">
                                      O preço que você está vendo é diferente?
                                    </Label>
                                    <Input
                                      id="preco-manual"
                                      type="text"
                                      placeholder="Ex: 99.90"
                                      value={precoManual}
                                      onChange={(e) => setPrecoManual(e.target.value)}
                                      className="max-w-[200px]"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Informe o preço que você está vendo no anúncio
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {produtoSelecionado && !dadosWebhook && !webhookLoading && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Preço mínimo permitido para</span>{" "}
                    <strong>{produtoSelecionado.nome}</strong>:{" "}
                    <strong className="text-primary">
                      R$ {produtoSelecionado.preco_minimo.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Adicione informações adicionais que possam ajudar na análise..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading || webhookLoading || !marketplaceDetectado || anuncioExistente}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Registrar Denúncia"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard-cliente")}
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
