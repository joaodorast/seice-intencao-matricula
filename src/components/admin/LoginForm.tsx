import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Lock, Mail, ShieldCheck, Sparkles, Zap } from "lucide-react";
import logo from "../../assets/seice-logo.png";
import mockupApp from "../../assets/Mockup-ClassApp-min.avif";
import { Button } from "../ui";

export default function LoginForm({
  onLogin,
  unidade,
}: {
  /** Valida o e-mail contra as contas cadastradas e a senha contra o backend. */
  onLogin: (email: string, token: string) => Promise<boolean>;
  /** Nome da unidade quando o login é de um painel específico (SEICE CE / JP). */
  unidade?: string;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [checking, setChecking] = useState(false);
  const [erro, setErro] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email.trim() || !senha.trim()) return;
    setChecking(true);
    setErro(false);
    const ok = await onLogin(email.trim(), senha.trim());
    setChecking(false);
    if (!ok) setErro(true);
  }

  const subtitulo = unidade
    ? `Acesso ao painel da unidade ${unidade}.`
    : "Painel geral — as duas unidades em um só lugar.";

  return (
    <div className="flex min-h-screen">
      {/* painel de marca — só em telas grandes, é onde mora o "efeito" */}
      <aside className="relative hidden w-[42%] max-w-md shrink-0 overflow-hidden bg-seice-deep lg:flex xl:max-w-lg">
        {/* a foto de fundo, escurecida por um degradê — mais escuro em cima,
            onde fica o texto, revelando mais da imagem perto do rodapé.
            object-contain (não cover) porque a foto é pequena: esticar pra
            cobrir o painel inteiro deixava ela borrada. */}
        <img
          src={mockupApp}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-72 w-full object-contain object-bottom [image-rendering:-webkit-optimize-contrast] xl:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-seice-deep from-15% via-seice-deep/80 via-50% to-seice-deep/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-seice-deep/85 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full w-full flex-col p-10 xl:p-14">
          <img src={logo} alt="Colégio SEICE" className="h-11 w-auto shrink-0 self-start xl:h-12" />

          <div className="mt-10 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-seice-gold/30 bg-seice-gold/10 px-3 py-1 text-[13.5px] font-bold uppercase tracking-[0.08em] text-seice-gold">
              Painel da secretaria
            </span>
            <h1 className="font-display mt-4 text-[31px] font-semibold leading-[1.2] text-white xl:text-[36px]">
              Toda intenção de matrícula, em um só painel.
            </h1>
            <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-white/70">
              Acompanhe intenções, gerencie turmas e exporte relatórios das unidades Campos Elíseos e Jardim
              Primavera — tudo atualizado em tempo real.
            </p>

            <ul className="mt-7 flex flex-col gap-3">
              <ItemMarca icon={<ShieldCheck size={16} />}>Dados protegidos com hash e RLS</ItemMarca>
              <ItemMarca icon={<Zap size={16} />}>Números atualizados em tempo real</ItemMarca>
              <ItemMarca icon={<Sparkles size={16} />}>Relatórios em PDF e Excel, por turma</ItemMarca>
            </ul>
          </div>

          <p className="mt-auto shrink-0 text-[13px] text-white/50">
            © {new Date().getFullYear()} Colégio SEICE
          </p>
        </div>

        <div className="gold-hairline absolute inset-y-0 right-0 z-10 w-px opacity-70" />
      </aside>

      {/* formulário */}
      <div className="relative flex flex-1 items-center justify-center p-5 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          <img src={logo} alt="Colégio SEICE" className="mx-auto mb-8 h-11 w-auto lg:hidden" />

          <form onSubmit={handleSubmit} className="card-surface rounded-2xl border border-seice-border p-7 sm:p-9">
            <div className="icon-tile mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
              <KeyRound size={21} />
            </div>
            <h2 className="font-display text-[24px] font-semibold text-seice-ink">Entrar no painel</h2>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-seice-muted">{subtitulo}</p>

            {erro && (
              <div className="mt-5 rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3 text-[15px] font-medium text-seice-danger">
                E-mail ou senha inválidos.
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              <Campo label="E-mail" icon={<Mail size={16} />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@seice.com.br"
                  autoComplete="username"
                  className="inset-surface w-full rounded-xl border border-seice-border-strong py-3 pl-10 pr-3.5 text-[16.5px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/15"
                />
              </Campo>

              <Campo label="Senha" icon={<Lock size={16} />}>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha de acesso"
                  autoComplete="current-password"
                  className="inset-surface w-full rounded-xl border border-seice-border-strong py-3 pl-10 pr-3.5 text-[16.5px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/15"
                />
              </Campo>
            </div>

            <Button type="submit" className="mt-7 w-full !py-3.5" disabled={checking}>
              {checking ? "Verificando..." : "Entrar"}
            </Button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[13.5px] text-seice-muted">
              <Lock size={13} className="shrink-0 text-seice-success" />
              Conexão segura — seus dados não são compartilhados.
            </p>
          </form>

          <Link
            to="/"
            className="mt-6 block text-center text-[15px] font-semibold text-seice-muted transition hover:text-seice-ink"
          >
            ← Voltar para o site
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function ItemMarca({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[15px] text-white/75">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-seice-gold">
        {icon}
      </span>
      {children}
    </li>
  );
}

function Campo({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 block text-[14.5px] font-bold text-seice-ink">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted">{icon}</span>
        {children}
      </div>
    </label>
  );
}
