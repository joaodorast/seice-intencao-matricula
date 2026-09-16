import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import logo from "../../assets/seice-logo.png";
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

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <form
        onSubmit={handleSubmit}
        className="card-surface w-full max-w-sm rounded-3xl border border-seice-border p-8 text-center"
      >
        <img src={logo} alt="Colégio SEICE" className="mx-auto mb-5 h-14 w-auto" />
        <div className="icon-tile mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl">
          <KeyRound size={20} />
        </div>
        <h1 className="font-display mb-1 text-[21.5px] font-semibold text-seice-ink">Painel da Secretaria</h1>
        <p className="mb-5 text-[15px] text-seice-muted">
          {unidade
            ? `Acesso ao painel da unidade ${unidade}.`
            : "Entre com o e-mail e a senha da secretaria para acessar o painel."}
        </p>

        {erro && (
          <div className="mb-4 rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3.5 text-left text-[15px] text-seice-danger">
            E-mail ou senha inválidos.
          </div>
        )}

        <div className="mb-3.5 text-left">
          <label className="mb-1.5 block text-[14.5px] font-bold text-seice-ink">E-mail</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@seice.com.br"
              autoComplete="username"
              className="inset-surface w-full rounded-xl border border-seice-border-strong px-3.5 py-3 pl-10 text-[17px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/20"
            />
          </div>
        </div>

        <div className="mb-4 text-left">
          <label className="mb-1.5 block text-[14.5px] font-bold text-seice-ink">Senha</label>
          <div className="relative">
            <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-seice-muted" />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha de acesso"
              autoComplete="current-password"
              className="inset-surface w-full rounded-xl border border-seice-border-strong px-3.5 py-3 pl-10 text-[17px] text-seice-ink outline-none placeholder:text-seice-muted focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/20"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={checking}>
          {checking ? "Verificando..." : "Entrar"}
        </Button>

        <Link
          to="/"
          className="mt-5 inline-block text-[14.5px] font-medium text-seice-muted transition hover:text-seice-ink"
        >
          ← Voltar para o site
        </Link>
      </form>
    </div>
  );
}
