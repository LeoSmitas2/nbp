import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const anuncioSchema = z.object({
  url: z.string().url("URL inválida").max(500, "URL muito longa"),
});

export default function AdicionarAnuncio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validar URL
      const validatedData = anuncioSchema.parse({ url });

      // Criar anúncio com status pendente (será completado pelo admin)
      const { error } = await supabase.from("anuncios_monitorados").insert({
        url: validatedData.url,
        // Campos temporários - admin precisará completar
        produto_id: "00000000-0000-0000-0000-000000000000", // Placeholder
        marketplace_id: "00000000-0000-0000-0000-000000000000", // Placeholder
        preco_detectado: 0,
        preco_minimo: 0,
        origem: "Manual",
        status: "OK",
      });

      if (error) {
        // Se der erro por falta de marketplace/produto, avisar ao usuário
        throw new Error("Por favor, cadastre marketplaces e produtos antes de adicionar anúncios");
      }

      toast({
        title: "Anúncio adicionado com sucesso!",
        description: "O anúncio foi cadastrado e está aguardando processamento.",
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
              Informe o link do anúncio que deseja monitorar
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
                <p className="text-sm text-muted-foreground">
                  Cole aqui o link completo do anúncio que deseja monitorar
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
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
