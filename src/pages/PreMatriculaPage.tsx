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
import { enviarComprovantePorEmail } from "../lib/emailComprovante";
import { turnoLabel } from "../lib/format";
import { ouvirMudancaDeVagas } from "../lib/realtime";
import { supabase } from "../lib/supabaseClient";
import { agruparPorTurno } from "../lib/turnos";
import { semVagaParaResponsavel, vaiParaListaEspera } from "../lib/vagasVisiveis";
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

// Turmas de todas as unidades numa única chamada — feita assim que a página
// abre, para a escolha da unidade já encontrar os dados prontos. Turmas sem
// vaga também entram na lista: mesmo cheias, a família consegue escolhê-las
// e entrar na lista de espera — só não aparece aqui o que a secretaria nunca
// chegou a cadastrar como turma.
// Exceção: turma esgotada (marcada pela secretaria, ou de unidade sem lista
// de espera que chegou a 0) continua aparecendo, mas com "VAGAS ESGOTADAS" e
// sem poder ser escolhida.
async function buscarTurmas(): Promise<TurmaDisponivel[] | null> {
  const { data, error } = await supabase.rpc("get_turmas_disponiveis");
  if (error) return null;
  // ?? cobre o banco ainda sem as colunas novas: tudo segue como antes
  const turmas = ((data || []) as TurmaDisponivel[]).map((t) => ({
    ...t,
    esgotada: t.esgotada ?? false,
    aceita_lista_espera: t.aceita_lista_espera ?? true,
  }));
  return agruparPorTurno(turmas);
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
    turmasRef.current = buscarTurmas();
  }, []);

  function recarregarTurmas() {
    turmasRef.current = buscarTurmas();
    return turmasRef.current;
  }

  // aplica uma lista nova de turmas sem perder o que a pessoa já escolheu:
  // atualiza os números de vaga da turma/série selecionadas em vez de trocá-las.
  // Casa pela chave série+turno (o cartão), não pelo id: a turma escolhida
  // por dentro do turno pode mudar quando as vagas mudam. A turma que a
  // pessoa já selecionou mantém o id — é nela que a vaga foi reservada.
  function sincronizarTurmas(lista: TurmaDisponivel[]) {
    const slug = unidade?.slug;
    if (!slug) return;
    const daUnidade = lista.filter((t) => t.unidade_id === slug);
    setTurmasDisponiveis(daUnidade);
    setTurma((atual) => {
      const nova = atual && daUnidade.find((t) => t.chave === atual.chave);
      return nova ? { ...nova, id: atual.id } : atual;
    });
    setSerieGroup((atual) =>
      atual
        ? { ...atual, turmas: atual.turmas.map((t) => daUnidade.find((n) => n.chave === t.chave) ?? t) }
        : atual
    );
  }

  // enquanto a pessoa está escolhendo, as vagas se atualizam sozinhas assim
  // que outra intenção (de qualquer visitante) é enviada ou cancelada — sem
  // precisar recarregar a página para ver o número certo
  useEffect(() => {
    if (!unidade) return;
    return ouvirMudancaDeVagas(() => {
      recarregarTurmas().then((lista) => {
        if (lista) sincronizarTurmas(lista);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidade?.slug]);

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
    if (semVagaParaResponsavel(t)) return;
    setTurma(t);
    go("dados");
  }

  async function handleSubmit(values: DadosFormValues) {
    setSubmitting(true);
    setSubmitErro(null);

    const payload = {
      unidade_id: unidade!.slug,
      turma_id: turma!.id,
      responsavel_nome: values.respNome.trim(),
      telefone1: values.respTel1Digits,
      telefone2: values.respTel2Digits || null,
      email: values.respEmail.trim(),
      aluno_nome: values.alunoNome.trim(),
    };

    // RPC em vez de INSERT direto: é a única forma de receber a senha
    // sequencial de volta sem dar permissão de leitura (SELECT) na tabela.
    // p_responsavel_cpf vai vazio: o campo de CPF foi retirado do formulário
    // a pedido da direção, mas a coluna no banco ainda exige o parâmetro.
    // Turma cheia não é mais erro: o banco aceita a intenção normalmente e
    // devolve lista_espera = true, então essa chamada praticamente não falha
    // mais por falta de vaga.
    // p_forcar_lista_espera: turma escondida da contagem pública (ver
    // vagasVisiveis.ts) sempre mostra "Lista de espera" pro responsável, então
    // o registro tem que cair em lista_espera = true de verdade no banco —
    // não só na tela — mesmo que ainda exista vaga real (que fica livre pra
    // a secretaria matricular manualmente). Turma sem lista de espera nunca
    // é forçada: se encher, o banco recusa com "Turma esgotada".
    const { data, error } = await supabase.rpc("enviar_intencao", {
      p_unidade_id: payload.unidade_id,
      p_turma_id: payload.turma_id,
      p_responsavel_nome: payload.responsavel_nome,
      p_responsavel_cpf: "",
      p_telefone1: payload.telefone1,
      p_telefone2: payload.telefone2,
      p_email: payload.email,
      p_aluno_nome: payload.aluno_nome,
      p_forcar_lista_espera: vaiParaListaEspera(turma!),
    });
    setSubmitting(false);

    // a turma esgotou enquanto a pessoa preenchia (ou a secretaria marcou
    // como esgotada): atualiza as vagas na tela e avisa com clareza
    if (error?.message?.includes("Turma esgotada")) {
      setSubmitErro("As vagas desta turma acabaram de esgotar. Volte e escolha outra turma.");
      recarregarTurmas().then((lista) => {
        if (lista) sincronizarTurmas(lista);
      });
      return;
    }

    const linha = data?.[0];
    if (error || !linha) {
      setSubmitErro("Não foi possível enviar sua intenção de matrícula agora. Verifique os dados e tente novamente.");
      return;
    }

    setSubmetida({
      ...payload,
      numeroSenha: linha.numero_senha,
      listaEspera: linha.lista_espera,
      posicaoEspera: linha.posicao_espera ?? null,
      resumoTurma: `${serieGroup!.serie} — ${turnoLabel(turma!.turno)}${
        turma!.curso ? " — " + turma!.curso : ""
      }`,
    });
    if (payload.email) enviarComprovantePorEmail(payload.unidade_id, linha.numero_senha);
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
