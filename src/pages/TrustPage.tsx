import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Database, UserCheck, FileText, Mail } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function TrustPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" /> Central de Confiança
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">
            Segurança & Privacidade
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Esta página é mantida pela equipe do É Pra Já para responder às dúvidas mais
            comuns sobre como protegemos os dados de lojistas, entregadores e clientes da
            nossa plataforma. O conteúdo é editorial — não constitui uma certificação
            independente.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card icon={<Lock className="h-5 w-5" />} title="Autenticação">
            Acesso à plataforma é protegido por contas individuais com senha. Funções
            sensíveis (admin, lojista, entregador) são separadas por papéis verificados no
            servidor a cada requisição.
          </Card>
          <Card icon={<Database className="h-5 w-5" />} title="Proteção de dados">
            Os dados ficam hospedados em infraestrutura gerenciada pelo Supabase, com
            criptografia em trânsito (TLS) e em repouso. Políticas de acesso por linha
            (RLS) restringem cada usuário aos seus próprios registros.
          </Card>
          <Card icon={<UserCheck className="h-5 w-5" />} title="Dados que coletamos">
            Nome, contato, endereço de coleta/entrega e dados de localização do entregador
            durante corridas ativas. Usamos esses dados apenas para operar o serviço de
            entregas e atendimento ao cliente.
          </Card>
          <Card icon={<FileText className="h-5 w-5" />} title="Retenção e exclusão">
            Mantemos os dados enquanto sua conta estiver ativa ou conforme exigido por
            obrigações legais e fiscais. Você pode solicitar exclusão entrando em contato
            com nosso suporte.
          </Card>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-6">
          <h2 className="text-lg font-bold">Subprocessadores principais</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Supabase — banco de dados, autenticação e funções de servidor</li>
            <li>Lovable — hospedagem do painel web</li>
            <li>MapLibre / Nominatim — exibição de mapas e geocodificação</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Mail className="h-5 w-5" /> Relatar uma vulnerabilidade
          </h2>
          <p className="text-sm text-muted-foreground">
            Encontrou um problema de segurança? Escreva para nosso suporte com detalhes
            de reprodução. Levamos a sério todos os relatos responsáveis e respondemos o
            mais rápido possível.
          </p>
        </section>

        <footer className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-4 border-t border-border/60">
          <Link to="/privacy" className="underline hover:text-foreground">Política de Privacidade</Link>
          <Link to="/terms" className="underline hover:text-foreground">Termos de Uso</Link>
        </footer>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-5 space-y-2">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
