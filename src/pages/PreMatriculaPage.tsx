import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BackgroundFX from "../components/BackgroundFX";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Stepper from "../components/Stepper";
import ConfirmacaoStep from "../components/steps/ConfirmacaoStep";
import DadosStep, { type DadosFormValues } from "../components/steps/DadosStep";
import NivelStep from "../components/steps/NivelStep";
import SerieStep from "../components/steps/SerieStep";
import TurmaStep from "../components/steps/TurmaStep";
import UnidadeStep from "../components/steps/UnidadeStep";
import { Card, Spinner } from "../components/ui";
import { turnoLabel } from "../lib/format";
import { supabase } from "../lib/supabaseClient";
import { UNIDADES } from "../config";
import type {
  Passo,
  PreMatriculaSubmetida,
  SerieGroup,
  TurmaDisponivel,
  Unidade,
} from "../types";

const STEP_ORDER: Passo[] = ["unidade", "nivel", "serie", "turma", "dados", "confirmacao"];

function agruparPorSerie(turmas: TurmaDisponivel[], nivel: string): SerieGroup[] {
  const doNivel = turmas.filter((t) => t.nivel === nivel);
  const map = new Map<number, SerieGroup>();
  for (const t of doNivel) {
    if (!map.has(t.ordem)) {
      map.set(t.ordem, { ordem: t.ordem, serie: t.serie, serie_full: t.serie_full, turmas: [] });
    }
    map.get(t.ordem)!.turmas.push(t);
  }
  return Array.from(map.values()).sort((a, b) => a.ordem - b.ordem);
}

// id gerado no navegador: o site só tem permissão de INSERT em pre_matriculas
// (sem SELECT, pra não expor dados das famílias), então não dá pra pedir a linha de volta
function novoId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Turmas com vaga de todas as unidades numa única chamada — feita assim que a
// página abre, para a escolha da unidade já encontrar os dados prontos.
async function buscarTurmasComVaga(): Promise<TurmaDisponivel[] | null> {
  const { data, error } = await supabase.rpc("get_turmas_disponiveis");
  if (error) return null;
  return ((data || []) as TurmaDisponivel[]).filter((t) => t.vagas_restantes > 0);
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
};

export default function PreMatriculaPage() {
  const [step, setStep] = useState<Passo>("unidade");
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<TurmaDisponivel[]>([]);
  const [nivel, setNivel] = useState<string | null>(null);
  const [serieGroup, setSerieGroup] = useState<SerieGroup | null>(null);
  const [turma, setTurma] = useState<TurmaDisponivel | null>(null);
  const [submetida, setSubmetida] = useState<PreMatriculaSubmetida | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadErro, setLoadErro] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErro, setSubmitErro] = useState<string | null>(null);

  const turmasRef = useRef<Promise<TurmaDisponivel[] | null> | null>(null);

  useEffect(() => {
    turmasRef.current = buscarTurmasComVaga();
  }, []);

  function recarregarTurmas() {
    turmasRef.current = buscarTurmasComVaga();
    return turmasRef.current;
  }

  const dirRef = useRef(1);
  function go(next: Passo) {
    dirRef.current = STEP_ORDER.indexOf(next) >= STEP_ORDER.indexOf(step) ? 1 : -1;
    setStep(next);
  }

  async function handlePickUnidade(slug: string) {
    const u = UNIDADES.find((x) => x.slug === slug)!;
    setUnidade(u);
    setLoadErro(null);

    // o "carregando" só aparece se os dados ainda não tiverem chegado
    const spinner = setTimeout(() => setLoading(true), 150);
    let lista = await (turmasRef.current ?? recarregarTurmas());
    if (!lista) lista = await recarregarTurmas();
    clearTimeout(spinner);
    setLoading(false);

    if (!lista) {
      setLoadErro("Não foi possível carregar as turmas agora. Tente novamente em instantes.");
      return;
    }

    setTurmasDisponiveis(lista.filter((t) => t.unidade_id === slug));
    go("nivel");
    recarregarTurmas(); // atualiza em segundo plano para a próxima consulta
  }

  function handlePickNivel(key: string) {
    setNivel(key);
    go("serie");
  }

  function handlePickSerie(ordem: number) {
    const grupo = agruparPorSerie(turmasDisponiveis, nivel!).find((s) => s.ordem === ordem)!;
    setSerieGroup(grupo);
    go("turma");
  }

  function handlePickTurma(id: string) {
    const t = serieGroup!.turmas.find((x) => x.id === id)!;
    setTurma(t);
    go("dados");
  }

  async function handleSubmit(values: DadosFormValues) {
    setSubmitting(true);
    setSubmitErro(null);

    const id = novoId();
    const payload = {
      unidade_id: unidade!.slug,
      turma_id: turma!.id,
      responsavel_nome: values.respNome.trim(),
      responsavel_cpf: values.respCpfDigits,
      telefone1: values.respTel1Digits,
      telefone2: values.respTel2Digits || null,
      email: values.respEmail.trim() || null,
      aluno_nome: values.alunoNome.trim(),
    };

    const { error } = await supabase.from("pre_matriculas").insert({ id, ...payload });
    setSubmitting(false);

    if (error) {
      const vagasEsgotadas = /vagas dispon/i.test(error.message || "");
      setSubmitErro(
        vagasEsgotadas
          ? "Que pena! As vagas dessa turma acabaram de se esgotar. Volte e escolha outra turma disponível."
          : "Não foi possível enviar sua intenção de matrícula agora. Verifique os dados e tente novamente."
      );
      if (vagasEsgotadas) {
        const slug = unidade!.slug;
        recarregarTurmas().then((lista) => {
          if (lista) setTurmasDisponiveis(lista.filter((t) => t.unidade_id === slug));
        });
      }
      return;
    }

    setSubmetida({
      ...payload,
      id,
      resumoTurma: `${serieGroup!.serie} — Turma ${turma!.codigo} (${turnoLabel(turma!.turno)})${
        turma!.curso ? " — " + turma!.curso : ""
      }`,
    });
    recarregarTurmas();
    go("confirmacao");
  }

  function restart() {
    dirRef.current = -1;
    setStep("unidade");
    setUnidade(null);
    setTurmasDisponiveis([]);
    setNivel(null);
    setSerieGroup(null);
    setTurma(null);
    setSubmetida(null);
    setSubmitErro(null);
    setLoadErro(null);
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-7 sm:pt-9">
        <Stepper atual={step} />

        <AnimatePresence mode="wait" custom={dirRef.current} initial={false}>
          <motion.div
            key={loading ? "loading" : loadErro ? "erro" : step}
            custom={dirRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {loading && (
              <Card>
                <Spinner label="Carregando turmas com vaga..." />
              </Card>
            )}

            {!loading && loadErro && (
              <Card>
                <div className="mb-4 rounded-xl bg-seice-danger-soft px-4 py-3.5 text-[15.5px] text-seice-danger">
                  {loadErro}
                </div>
                <button className="font-semibold text-seice-ink underline underline-offset-2" onClick={restart}>
                  Recomeçar
                </button>
              </Card>
            )}

            {!loading && !loadErro && step === "unidade" && <UnidadeStep onPick={handlePickUnidade} />}

            {!loading && !loadErro && step === "nivel" && unidade && (
              <NivelStep
                unidade={unidade}
                turmas={turmasDisponiveis}
                onBack={() => go("unidade")}
                onPick={handlePickNivel}
                onTrocarUnidade={restart}
              />
            )}

            {!loading && !loadErro && step === "serie" && unidade && nivel && (
              <SerieStep
                unidade={unidade}
                nivel={nivel}
                series={agruparPorSerie(turmasDisponiveis, nivel)}
                onBack={() => go("nivel")}
                onPick={handlePickSerie}
              />
            )}

            {!loading && !loadErro && step === "turma" && unidade && serieGroup && (
              <TurmaStep
                unidade={unidade}
                serieGroup={serieGroup}
                onBack={() => go("serie")}
                onPick={handlePickTurma}
              />
            )}

            {!loading && !loadErro && step === "dados" && unidade && serieGroup && turma && (
              <DadosStep
                unidade={unidade}
                serieGroup={serieGroup}
                turma={turma}
                submitting={submitting}
                errorMsg={submitErro}
                onBack={() => go("turma")}
                onSubmit={handleSubmit}
              />
            )}

            {step === "confirmacao" && unidade && submetida && (
              <ConfirmacaoStep unidade={unidade} submetida={submetida} onRestart={restart} />
            )}
          </motion.div>
        </AnimatePresence>

        <Footer />
      </main>
    </div>
  );
}
