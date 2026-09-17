import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Lock, Mail, ShieldCheck, Sparkles, Zap } from "lucide-react";
import logo from "../../assets/seice-logo.png";
import logoIcon from "../../assets/seice-icon.png";
import { Button } from "../ui";

const EMAIL_ADMIN = "admin@seice.com.br";

export default function LoginForm({
  onLogin,
  unidade,
}: {
  onLogin: (token: string) => Promise<boolean>;
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
    if (email.trim().toLowerCase() !== EMAIL_ADMIN) {
      setChecking(false);
      setErro(true);
      return;
    }
    const ok = await onLogin(senha.trim());
    setChecking(false);
    if (!ok) setErro(true);
  }

  const subtitulo = unidade
    ? `Acesso ao painel da unidade ${unidade}.`
    : "Painel geral — as duas unidades em um só lugar.";

  return (
    <div className="flex min-h-screen">
      {/* painel de marca — só em telas grandes, é onde mora o "efeito" */}
      <aside className="relative hidden w-[42%] max-w-md shrink-0 flex-col justify-between overflow-hidden bg-seice-deep p-10 lg:flex xl:max-w-lg xl:p-14">
        <div
          className="dot-texture pointer-events-none absolute inset-0 opacity-50"
          style={{
            maskImage: "radial-gradient(ellipse 90% 70% at 30% 20%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 30% 20%, black, transparent 75%)",
          }}
        />
        <img
          src={logoIcon}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-24 h-96 w-96 opacity-[0.06]"
        />

        <img src={logo} alt="Colégio SEICE" className="relative h-11 w-auto xl:h-12" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-seice-gold/30 bg-seice-gold/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-seice-gold">
            Painel da secretaria
          </span>
          <h1 className="font-display mt-4 text-[28px] font-semibold leading-[1.2] text-white xl:text-[32px]">
            Toda intenção de matrícula, em um só painel.
          </h1>
          <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-white/55">
            Acompanhe intenções, gerencie turmas e exporte relatórios das unidades Campos Elíseos e Jardim
            Primavera — tudo atualizado em tempo real.
          </p>

          <ul className="mt-7 flex flex-col gap-3">
            <ItemMarca icon={<ShieldCheck size={16} />}>Dados protegidos com hash e RLS</ItemMarca>
            <ItemMarca icon={<Zap size={16} />}>Números atualizados em tempo real</ItemMarca>
            <ItemMarca icon={<Sparkles size={16} />}>Relatórios em PDF e Excel, por turma</ItemMarca>
          </ul>
        </div>

        <p className="relative text-[12px] text-white/35">© {new Date().getFullYear()} Colégio SEICE</p>

        <div className="gold-hairline absolute inset-y-0 right-0 w-px opacity-70" />
      </aside>

      {/* formulário */}
      <div className="relative flex flex-1 items-center justify-center p-5 sm:p-10">
        <div
          className="dot-texture pointer-events-none absolute inset-0 opacity-25 lg:hidden"
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent 55%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 55%)",
          }}
        />

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
            <h2 className="font-display text-[21px] font-semibold text-seice-ink">Entrar no painel</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-seice-muted">{subtitulo}</p>

            {erro && (
              <div className="mt-5 rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3 text-[13.5px] font-medium text-seice-danger">
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
                  className="inset-surface w-full rounded-xl border border-seice-border-strong py-3 pl-10 pr-3.5 text-[15px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/15"
                />
              </Campo>

              <Campo label="Senha" icon={<Lock size={16} />}>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha de acesso"
                  autoComplete="current-password"
                  className="inset-surface w-full rounded-xl border border-seice-border-strong py-3 pl-10 pr-3.5 text-[15px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/15"
                />
              </Campo>
            </div>

            <Button type="submit" className="mt-7 w-full !py-3.5" disabled={checking}>
              {checking ? "Verificando..." : "Entrar"}
            </Button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-seice-muted">
              <Lock size={12} className="shrink-0 text-seice-success" />
              Conexão segura — seus dados não são compartilhados.
            </p>
          </form>

          <Link
            to="/"
            className="mt-6 block text-center text-[13.5px] font-semibold text-seice-muted transition hover:text-seice-ink"
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
    <li className="flex items-center gap-2.5 text-[13.5px] text-white/75">
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
      <span className="mb-1.5 block text-[13px] font-bold text-seice-ink">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted">{icon}</span>
        {children}
      </div>
    </label>
  );
}
