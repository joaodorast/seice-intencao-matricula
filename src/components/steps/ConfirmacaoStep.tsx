import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Printer, RotateCcw } from "lucide-react";
import { formatarSenha, maskPhone } from "../../lib/format";
import type { PreMatriculaSubmetida, Unidade } from "../../types";
import logoIcon from "../../assets/seice-icon.png";
import { Button, Card } from "../ui";

export default function ConfirmacaoStep({
  unidade,
  submetida,
  onRestart,
}: {
  unidade: Unidade;
  submetida: PreMatriculaSubmetida;
  onRestart: () => void;
}) {
  useEffect(() => {
    // confete carregado só aqui, pra não pesar no carregamento inicial do site
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelado) return;
      const colors = ["#14161b", "#565d6a", "#f2c318", "#a9b1bd"];
      confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin: { y: 0.35 }, colors });
      timer = setTimeout(() => {
        confetti({ particleCount: 50, spread: 100, startVelocity: 30, origin: { y: 0.5 }, colors });
      }, 250);
    });
    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const senha = formatarSenha(submetida.numeroSenha);

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-seice-success text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_32px_-10px_rgba(21,128,61,0.55)]"
      >
        <CheckCircle2 size={40} strokeWidth={2.2} />
      </motion.div>

      <div className="text-center">
        <h2 className="font-display text-[30px] font-semibold tracking-tight text-seice-ink sm:text-[33.5px]">
          Intenção de matrícula enviada!
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[17px] leading-relaxed text-seice-muted">
          Recebemos os dados de <strong className="font-semibold text-seice-ink">{submetida.aluno_nome}</strong>{" "}
          para a unidade <strong className="font-semibold text-seice-ink">{unidade.nome}</strong>. Guarde sua
          senha de atendimento — a secretaria vai entrar em contato para dar continuidade.
        </p>
      </div>

      {/* "ticket" de comprovante, imprimível */}
      <Card id="comprovante" className="w-full max-w-md overflow-hidden !p-0">
        <div className="relative flex items-center justify-between gap-3 bg-seice-deep px-5 py-4">
          <img src={logoIcon} alt="SEICE" className="h-9 w-auto" />
          <div className="text-right">
            <div className="text-[12.5px] font-semibold uppercase tracking-wide text-white/60">Senha</div>
            <div className="font-mono text-[22px] font-bold leading-none text-seice-gold">{senha}</div>
          </div>
          <div className="gold-hairline absolute inset-x-0 bottom-0 h-px opacity-80" />
        </div>
        <div className="relative px-5 py-4">
          <div className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-seice-bg" />
          <div className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-seice-bg" />
          <div className="border-b border-dashed border-seice-border pb-3">
            <div className="text-[13.5px] font-semibold uppercase tracking-wide text-seice-muted">Aluno(a)</div>
            <div className="text-[18px] font-bold text-seice-ink">{submetida.aluno_nome}</div>
          </div>
          <dl className="mt-3 flex flex-col gap-2 text-[15.5px]">
            <Row label="Unidade" value={unidade.nome} />
            <Row label="Turma" value={submetida.resumoTurma} />
            <Row label="Responsável" value={submetida.responsavel_nome} />
            <Row label="Telefone" value={maskPhone(submetida.telefone1)} />
          </dl>
        </div>
      </Card>

      <div className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row">
        <Button variant="ghost" className="flex-1" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir comprovante
        </Button>
        <Button variant="ghost" className="flex-1" onClick={onRestart}>
          <RotateCcw size={16} /> Nova intenção
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-seice-muted">{label}</dt>
      <dd className="text-right font-semibold text-seice-ink">{value}</dd>
    </div>
  );
}
