import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Mail,
  Phone,
  School,
  Send,
  ShieldCheck,
  Timer,
  User,
} from "lucide-react";
import { maskPhone, onlyDigits, turnoLabel, validEmail } from "../../lib/format";
import { RESERVA_MINUTOS, liberarReserva, renovarReserva, reservarVaga } from "../../lib/reservas";
import { vagaVisivelParaResponsavel } from "../../lib/vagasVisiveis";
import type { SerieGroup, TurmaDisponivel, Unidade } from "../../types";
import { BackBar, Badge, Button, Card, SectionDesc, SectionEyebrow, SectionTitle } from "../ui";

export interface DadosFormValues {
  respNome: string;
  respTel1Digits: string;
  respTel2Digits: string;
  respEmail: string;
  alunoNome: string;
}

const emptyForm: DadosFormValues = {
  respNome: "",
  respTel1Digits: "",
  respTel2Digits: "",
  respEmail: "",
  alunoNome: "",
};

export default function DadosStep({
  unidade,
  serieGroup,
  turma,
  submitting,
  errorMsg,
  onBack,
  onSubmit,
}: {
  unidade: Unidade;
  serieGroup: SerieGroup;
  turma: TurmaDisponivel;
  submitting: boolean;
  errorMsg: string | null;
  onBack: () => void;
  onSubmit: (values: DadosFormValues) => void;
}) {
  const [values, setValues] = useState<DadosFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Reserva de vaga: ao primeiro caractere digitado, a vaga sai da contagem
  // pública por alguns minutos, para que ninguém a ocupe no meio do
  // preenchimento. Some sozinha se a pessoa desistir ou fechar a página.
  const reservaRef = useRef<string | null>(null);
  const [reservaAte, setReservaAte] = useState<number | null>(null);
  const [reservaFalhou, setReservaFalhou] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  async function garantirReserva() {
    if (reservaRef.current) return;
    // turma sem vaga visível pro responsável (real ou fora da lista liberada
    // pela direção): não faz sentido reservar — a pessoa já está sendo
    // avisada que vai pra lista de espera, sem contador de reserva na tela
    if (!(vagaVisivelParaResponsavel(turma) && turma.vagas_restantes > 0)) return;
    reservaRef.current = "pendente"; // evita disparar duas vezes seguidas
    const id = await reservarVaga(turma.id);
    if (!id) {
      reservaRef.current = null;
      setReservaFalhou(true);
      return;
    }
    reservaRef.current = id;
    setReservaAte(Date.now() + RESERVA_MINUTOS * 60_000);
  }

  // libera a reserva ao sair da tela (voltar, recomeçar ou após o envio)
  useEffect(() => {
    return () => {
      const id = reservaRef.current;
      if (id && id !== "pendente") void liberarReserva(id);
    };
  }, []);

  // renova enquanto a pessoa continua na tela e atualiza o contador
  useEffect(() => {
    if (!reservaAte) return;
    const contador = setInterval(() => setAgora(Date.now()), 1000);
    const renovacao = setInterval(
      () => {
        const id = reservaRef.current;
        if (!id || id === "pendente") return;
        void renovarReserva(id).then(() => setReservaAte(Date.now() + RESERVA_MINUTOS * 60_000));
      },
      (RESERVA_MINUTOS - 2) * 60_000
    );
    return () => {
      clearInterval(contador);
      clearInterval(renovacao);
    };
  }, [reservaAte]);

  const restanteMs = reservaAte ? Math.max(reservaAte - agora, 0) : 0;
  const restanteTxt = `${Math.floor(restanteMs / 60_000)}:${String(
    Math.floor((restanteMs % 60_000) / 1000)
  ).padStart(2, "0")}`;

  const nomeOk = values.respNome.trim().length >= 3;
  const tel1Ok = values.respTel1Digits.length >= 10;
  const tel2Ok = values.respTel2Digits.length >= 10;
  const emailOk = values.respEmail.trim().length > 0 && validEmail(values.respEmail.trim());
  const alunoOk = values.alunoNome.trim().length >= 3;

  function set<K extends keyof DadosFormValues>(key: K, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    // some com o erro assim que a pessoa volta a digitar no campo
    setErrors((e) => (e[key] ? { ...e, [key]: false } : e));
    if (val.length > 0) void garantirReserva();
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();

    setErrors({
      respNome: !nomeOk,
      respTel1Digits: !tel1Ok,
      respEmail: !emailOk,
      alunoNome: !alunoOk,
    });

    if (!(nomeOk && tel1Ok && emailOk && alunoOk)) return;
    onSubmit(values);
  }

  const vagas = turma.vagas_restantes;
  // mesma regra do badge "Sua escolha": turma fora da lista liberada pela
  // direção, ou já zerada, sempre mostra/avisa lista de espera pro
  // responsável — mesmo quando ainda sobra vaga de verdade no banco
  const mostraListaEspera = !(vagaVisivelParaResponsavel(turma) && vagas > 0);

  return (
    <>
      <BackBar
        label={
          <>
            {unidade.nome} · <strong className="font-semibold text-seice-ink">{serieGroup.serie}</strong>
          </>
        }
        onBack={onBack}
      />
      <Card>
      <SectionEyebrow>Passo 5 de 6</SectionEyebrow>
      <SectionTitle>Quase lá! Preencha os dados</SectionTitle>
      <SectionDesc>Sem nenhuma cobrança nesta etapa — é só preencher e enviar.</SectionDesc>

      {/* resumo da escolha — fica no topo em qualquer tamanho de tela */}
      <div className="inset-surface rounded-xl border border-seice-border p-4 sm:p-5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13.5px] font-bold uppercase tracking-[0.1em] text-seice-muted">Sua escolha</span>
          {mostraListaEspera ? (
            <Badge tone="gold" icon={<Timer size={13} />}>
              Lista de espera
            </Badge>
          ) : (
            <Badge tone="success" icon={<CheckCircle2 size={13} />}>
              {vagas} vaga{vagas === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <dl className={`grid grid-cols-2 gap-x-4 gap-y-3 ${turma.curso ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <SummaryItem label="Unidade" value={unidade.nome} />
          <SummaryItem label="Série" value={serieGroup.serie} />
          <SummaryItem label="Turma" value={`${turma.codigo} · ${turnoLabel(turma.turno)}`} />
          {turma.curso && <SummaryItem label="Curso" value={turma.curso} />}
        </dl>
      </div>

      {/* turma sem vaga visível pro responsável (real ou só escondida da
          contagem pública): não tenta reservar, só avisa que vai entrar na
          lista de espera — nada de alarme aqui */}
      {mostraListaEspera && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-seice-gold/40 bg-seice-gold-soft px-4 py-3">
          <Timer size={17} className="shrink-0 text-seice-gold" />
          <p className="text-[14.5px] leading-snug text-seice-ink">
            <strong className="font-semibold">Esta turma está sem vagas no momento.</strong> Ao enviar, sua
            intenção entra na lista de espera — se surgir uma desistência, a secretaria entra em contato.
          </p>
        </div>
      )}

      {/* aviso da reserva: aparece assim que a pessoa começa a digitar */}
      {reservaAte && restanteMs > 0 && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-seice-gold/40 bg-seice-gold-soft px-4 py-3">
          <Timer size={17} className="shrink-0 text-seice-gold" />
          <p className="text-[14.5px] leading-snug text-seice-ink">
            <strong className="font-semibold">Vaga reservada para você</strong> — conclua em{" "}
            <span className="font-mono font-bold tabular-nums text-seice-gold">{restanteTxt}</span>. Enquanto
            isso, ninguém mais consegue ocupar esta vaga.
          </p>
        </div>
      )}
      {reservaFalhou && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-seice-danger/40 bg-seice-danger-soft px-4 py-3">
          <CircleAlert size={17} className="shrink-0 text-seice-danger" />
          <p className="text-[14.5px] leading-snug text-seice-ink">
            Não foi possível reservar esta vaga — ela pode ter acabado de ser ocupada. Você ainda pode enviar,
            mas recomendamos voltar e conferir as turmas disponíveis.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <FormSection
          title="Dados do responsável"
          subtitle="Quem vai acompanhar a matrícula"
          icon={<User size={16} />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              label="Nome completo"
              value={values.respNome}
              onChange={(v) => set("respNome", v)}
              valid={nomeOk}
              error={errors.respNome}
              errorMsg="Informe o nome completo do responsável."
              autoComplete="name"
              placeholder="Nome e sobrenome"
              icon={<User size={17} />}
            />
            <Field
              label="Telefone principal"
              type="tel"
              value={maskPhone(values.respTel1Digits)}
              onChange={(v) => set("respTel1Digits", onlyDigits(v))}
              valid={tel1Ok}
              error={errors.respTel1Digits}
              errorMsg="Informe um telefone válido com DDD."
              inputMode="numeric"
              maxLength={15}
              autoComplete="tel-national"
              placeholder="(00) 00000-0000"
              icon={<Phone size={17} />}
            />
            <Field
              label="Segundo telefone"
              optionalLabel
              type="tel"
              value={maskPhone(values.respTel2Digits)}
              onChange={(v) => set("respTel2Digits", onlyDigits(v))}
              valid={tel2Ok}
              inputMode="numeric"
              maxLength={15}
              placeholder="(00) 00000-0000"
              icon={<Phone size={17} />}
            />
            <Field
              className="sm:col-span-2"
              label="E-mail"
              type="email"
              value={values.respEmail}
              onChange={(v) => set("respEmail", v)}
              valid={emailOk}
              error={errors.respEmail}
              errorMsg="Informe um e-mail válido."
              autoComplete="email"
              placeholder="voce@email.com"
              icon={<Mail size={17} />}
            />
          </div>
        </FormSection>

        <FormSection title="Dados do aluno" subtitle="Quem vai estudar na turma escolhida" icon={<School size={16} />}>
          <Field
            label="Nome completo do aluno(a)"
            value={values.alunoNome}
            onChange={(v) => set("alunoNome", v)}
            valid={alunoOk}
            error={errors.alunoNome}
            errorMsg="Informe o nome completo do aluno."
            autoComplete="off"
            placeholder="Nome e sobrenome do aluno"
            icon={<School size={17} />}
          />
        </FormSection>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-seice-danger/20 bg-seice-danger-soft px-4 py-3.5 text-[15.5px] leading-relaxed text-seice-danger"
          >
            <CircleAlert size={17} className="mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onBack} className="sm:!px-5">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <Button type="submit" className="flex-1 !py-3.5" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Enviar intenção de matrícula
                  <Send size={16} />
                </>
              )}
            </Button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-center text-[14.5px] text-seice-muted">
            <ShieldCheck size={15} className="shrink-0 text-seice-success" />
            Seus dados protegidos
          </p>
        </div>
      </form>
    </Card>
    </>
  );
}

function FormSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-seice-border bg-seice-panel p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 flex items-center gap-3">
        <span className="icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="font-display text-[18px] font-semibold leading-tight text-seice-ink">{title}</div>
          {subtitle && <div className="text-[14.5px] text-seice-muted">{subtitle}</div>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13.5px] font-medium text-seice-muted">{label}</dt>
      <dd className="break-words text-[16px] font-bold leading-snug text-seice-ink">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  valid,
  error,
  errorMsg,
  optionalLabel,
  type = "text",
  inputMode,
  maxLength,
  placeholder,
  autoComplete,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  valid?: boolean;
  error?: boolean;
  errorMsg?: string;
  optionalLabel?: boolean;
  type?: string;
  inputMode?: "numeric" | "text";
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const showValid = valid && !error;

  return (
    <div className={`group min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-[15px] font-semibold text-seice-ink">
        {label}
        {optionalLabel ? (
          <span className="text-[14px] font-medium text-seice-muted">(opcional)</span>
        ) : (
          <span className="text-seice-danger">*</span>
        )}
      </label>
      <div className="relative">
        {icon && (
          <span
            className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
              error ? "text-seice-danger" : "text-seice-muted group-focus-within:text-seice-ink"
            }`}
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error || undefined}
          className={`h-12 w-full min-w-0 rounded-xl border bg-seice-deep-soft pl-11 pr-10 text-[17px] text-seice-ink outline-none transition-[border-color,box-shadow] placeholder:text-[#9aa1ac] focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/10 ${
            error
              ? "border-seice-danger ring-4 ring-seice-danger/10"
              : showValid
              ? "border-seice-success/50 hover:border-seice-success/70"
              : "border-seice-border-strong hover:border-seice-graphite/50"
          }`}
        />
        {showValid && (
          <CheckCircle2
            size={17}
            className="animate-pop-in pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-seice-success"
          />
        )}
      </div>
      {error && errorMsg && (
        <div className="mt-1.5 flex items-center gap-1 text-[14px] font-medium text-seice-danger">
          <CircleAlert size={13} className="shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
