import logoNash from "@/assets/logo-nash.png";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <img src={logoNash} alt="Nash" className="mx-auto mb-8 h-24 w-auto" />
        <h1 className="mb-4 text-4xl font-bold">Brand Protection Nash</h1>
        <p className="text-xl text-muted-foreground">Sistema de Monitoramento de Anúncios</p>
      </div>
    </div>
  );
};

export default Index;
