import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Printer, RotateCcw } from "lucide-react";
import { maskPhone } from "../../lib/format";
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
  const listaEspera = submetida.listaEspera;

  useEffect(() => {
    // confete só faz sentido quando a vaga foi garantida — não faz sentido
    // comemorar entrar numa lista de espera
    if (listaEspera) return;
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
  }, [listaEspera]);

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_32px_-10px_rgba(0,0,0,0.35)] ${
          listaEspera ? "bg-seice-gold text-seice-gold-ink" : "bg-seice-success"
        }`}
      >
        {listaEspera ? <Clock size={40} strokeWidth={2.2} /> : <CheckCircle2 size={40} strokeWidth={2.2} />}
      </motion.div>

      <div className="text-center">
        <h2 className="font-display text-[30px] font-semibold tracking-tight text-seice-ink sm:text-[33.5px]">
          {listaEspera ? "Você entrou na lista de espera!" : "Intenção de matrícula enviada!"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[17px] leading-relaxed text-seice-muted">
          {listaEspera ? (
            <>
              As vagas da turma escolhida pra{" "}
              <strong className="font-semibold text-seice-ink">{submetida.aluno_nome}</strong> já foram
              preenchidas, mas seus dados foram cadastrados. Se surgir uma desistência, a secretaria entrará em
              contato para oferecer a vaga.
            </>
          ) : (
            <>
              Recebemos os dados de <strong className="font-semibold text-seice-ink">{submetida.aluno_nome}</strong>{" "}
              para a unidade <strong className="font-semibold text-seice-ink">{unidade.nome}</strong>. A secretaria
              vai entrar em contato para dar continuidade.
            </>
          )}
        </p>
      </div>

      {/* ticket na tela, com o visual normal do site (dourado/escuro) */}
      <Card className="w-full max-w-md overflow-hidden !p-0">
        <ComprovanteConteudo submetida={submetida} unidade={unidade} />
      </Card>

      {/* cópia só pra impressão, fora da árvore da página: assim o resto do
          site (bem mais alto que o ticket) não conta como espaço em branco
          e empurra o comprovante para uma segunda folha. */}
      {createPortal(
        <div id="comprovante-impressao" className="hidden print:block">
          <ComprovanteConteudo submetida={submetida} unidade={unidade} />
        </div>,
        document.body
      )}

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

/**
 * Conteúdo do "ticket", usado tanto na tela quanto na cópia de impressão. Os
 * hooks comprovante-* são o que o @media print (index.css) usa pra padronizar
 * fonte/cor/tamanho no papel, sem mexer no visual normal da tela.
 */
function ComprovanteConteudo({
  submetida,
  unidade,
}: {
  submetida: PreMatriculaSubmetida;
  unidade: Unidade;
}) {
  return (
    <div className="comprovante-ticket">
      <p className="comprovante-titulo-impresso hidden text-center text-[13px] font-bold uppercase tracking-[0.14em] text-seice-muted print:block">
        Comprovante de intenção de matrícula
      </p>
      {submetida.listaEspera && (
        <div className="comprovante-lista-espera bg-seice-gold px-5 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-seice-gold-ink">
          Lista de espera
        </div>
      )}
      <div className="comprovante-cabecalho relative flex items-center justify-center gap-3 bg-seice-deep px-5 py-4">
        <img src={logoIcon} alt="SEICE" className="comprovante-logo h-9 w-auto" />
        <div className="gold-hairline absolute inset-x-0 bottom-0 h-px opacity-80" />
      </div>
      <div className="comprovante-corpo relative px-5 py-4">
        <div className="comprovante-notch absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-seice-bg" />
        <div className="comprovante-notch absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-seice-bg" />
        <div className="comprovante-linha border-b border-dashed border-seice-border pb-3">
          <div className="comprovante-rotulo text-[13.5px] font-semibold uppercase tracking-wide text-seice-muted">
            Aluno(a)
          </div>
          <div className="comprovante-aluno text-[18px] font-bold text-seice-ink">{submetida.aluno_nome}</div>
        </div>
        <dl className="comprovante-dados mt-3 flex flex-col gap-2 text-[15.5px]">
          <Row label="Unidade" value={unidade.nome} />
          <Row label="Turma" value={submetida.resumoTurma} />
          <Row label="Responsável" value={submetida.responsavel_nome} />
          <Row label="Telefone" value={maskPhone(submetida.telefone1)} />
        </dl>
        <p className="comprovante-rodape-impresso hidden pt-4 text-[12px] text-seice-muted print:block">
          Colégio SEICE · gerado em {new Date().toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="comprovante-linha-dado flex items-start justify-between gap-3">
      <dt className="comprovante-rotulo text-seice-muted">{label}</dt>
      <dd className="comprovante-valor text-right font-semibold text-seice-ink">{value}</dd>
    </div>
  );
}
