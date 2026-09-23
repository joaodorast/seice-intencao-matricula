import type { ReactNode } from "react";
import { Clock3, ShieldCheck } from "lucide-react";
import logo from "../assets/seice-logo.png";

export default function Header() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-seice-deep via-seice-deep-soft to-seice-panel pt-[env(safe-area-inset-top,0px)]">
      {/* textura fina, decorativa, esmaecida para baixo */}
      <div
        className="dot-texture pointer-events-none absolute inset-x-0 top-0 h-56 opacity-60"
        style={{
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />
      {/* fio dourado na base do cabeçalho */}
      <div className="gold-hairline pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-70" />

      <div className="relative mx-auto flex max-w-3xl flex-col gap-7 px-5 py-7 sm:py-9">
        <img
          src={logo}
          alt="Colégio SEICE — Sistema de Ensino Integrado de Campos Elíseos"
          width={672}
          height={247}
          className="h-12 w-auto shrink-0 self-start sm:h-14"
        />

        <div>
          <h1 className="font-display text-[33.5px] font-semibold leading-[1.12] tracking-tight text-seice-ink sm:text-[45px]">
            Quero uma vaga no Seice!
          </h1>
          <p className="mt-3 max-w-xl text-[17.5px] leading-relaxed text-seice-muted sm:text-[18.5px]">
            Registre o interesse na vaga do seu filho nas unidades{" "}
            <strong className="font-semibold text-seice-ink">Campos Elíseos</strong> e{" "}
            <strong className="font-semibold text-seice-ink">Jardim Primavera</strong> — do Maternal ao 3º
            ano do Ensino Médio.
          </p>
        </div>

        <ul className="flex flex-wrap gap-2.5">
          <TrustPill icon={<Clock3 size={15} />}>Menos de 3 minutos</TrustPill>
          <TrustPill icon={<ShieldCheck size={15} />}>Dados protegidos</TrustPill>
        </ul>
      </div>
    </header>
  );
}

function TrustPill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="raised-surface inline-flex items-center gap-2 rounded-full border border-seice-border px-3.5 py-2 text-[14.5px] font-medium text-seice-soft">
      <span className="text-seice-soft">{icon}</span>
      {children}
    </li>
  );
}
