import { useEffect, useState } from "react";
import { NIVEIS, UNIDADES } from "../../config";
import type { Nivel, TurmaAdminRow, TurmaFormValues, Turno } from "../../types";
import { Button } from "../ui";

const CURSOS_MEDIO = ["Informática", "Enfermagem", "Administração"];

const VAZIO: TurmaFormValues = {
  unidade_id: UNIDADES[0]?.slug ?? "",
  nivel: "infantil",
  serie: "",
  serie_full: "",
  ordem: 1,
  codigo: "",
  turno: "M",
  curso: null,
  capacidade: 0,
  matriculados: 0,
  vagas_planilha: 0,
  ano_letivo: 2027,
};

export default function TurmaForm({
  turma,
  onSubmit,
  onCancel,
  salvando,
  erro,
}: {
  turma?: TurmaAdminRow | null;
  onSubmit: (values: TurmaFormValues) => void;
  onCancel: () => void;
  salvando: boolean;
  erro: string | null;
}) {
  const [values, setValues] = useState<TurmaFormValues>(VAZIO);

  useEffect(() => {
    if (turma) {
      setValues({
        unidade_id: turma.unidade_id,
        nivel: turma.nivel,
        serie: turma.serie,
        serie_full: turma.serie_full,
        ordem: turma.ordem,
        codigo: turma.codigo,
        turno: turma.turno,
        curso: turma.curso,
        capacidade: turma.capacidade,
        matriculados: turma.matriculados,
        vagas_planilha: turma.vagas_planilha,
        ano_letivo: turma.ano_letivo,
      });
    } else {
      setValues(VAZIO);
    }
  }, [turma]);

  function set<K extends keyof TurmaFormValues>(key: K, v: TurmaFormValues[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    // "Capacidade" não tem campo próprio na tela — é só matriculados (histórico
    // da planilha) + vagas ofertadas ao site, calculada automaticamente para
    // manter o dado consistente sem pedir mais um número de quem preenche.
    onSubmit({ ...values, capacidade: values.matriculados + values.vagas_planilha });
  }

  const vagasRestantesPreview = Math.max(
    0,
    values.vagas_planilha - (turma?.pre_matriculas_recebidas ?? 0)
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {erro && (
        <div className="rounded-xl bg-seice-danger-soft px-4 py-3 text-[14.5px] text-[#8a1f1f]">{erro}</div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Unidade">
          <select
            value={values.unidade_id}
            onChange={(e) => set("unidade_id", e.target.value)}
            className={inputCls}
          >
            {UNIDADES.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ano letivo">
          <input
            type="number"
            value={values.ano_letivo}
            onChange={(e) => set("ano_letivo", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nível de ensino">
          <select
            value={values.nivel}
            onChange={(e) => {
              const nivel = e.target.value as Nivel;
              set("nivel", nivel);
              if (nivel !== "medio") set("curso", null);
            }}
            className={inputCls}
          >
            {NIVEIS.map((n) => (
              <option key={n.key} value={n.key}>
                {n.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Turno">
          <select
            value={values.turno}
            onChange={(e) => set("turno", e.target.value as Turno)}
            className={inputCls}
          >
            <option value="M">Manhã</option>
            <option value="T">Tarde</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Série (curta)" hint="Ex.: 1º ano">
          <input
            type="text"
            value={values.serie}
            onChange={(e) => set("serie", e.target.value)}
            placeholder="1º ano"
            className={inputCls}
            required
          />
        </Field>
        <Field label="Série (completa)" hint="Ex.: 1º ano do Ensino Médio">
          <input
            type="text"
            value={values.serie_full}
            onChange={(e) => set("serie_full", e.target.value)}
            placeholder="1º ano do Ensino Médio"
            className={inputCls}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Código da turma" hint="Ex.: 1101">
          <input
            type="text"
            value={values.codigo}
            onChange={(e) => set("codigo", e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Ordem de exibição">
          <input
            type="number"
            value={values.ordem}
            onChange={(e) => set("ordem", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      {values.nivel === "medio" && (
        <Field label="Curso (Ensino Médio)">
          <select
            value={values.curso ?? ""}
            onChange={(e) => set("curso", e.target.value || null)}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {CURSOS_MEDIO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="h-px bg-seice-border" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Matriculados (planilha)" hint="Já ocupadas antes do site">
          <input
            type="number"
            min={0}
            value={values.matriculados}
            onChange={(e) => set("matriculados", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Vagas ofertadas" hint="Disponíveis no site">
          <input
            type="number"
            min={0}
            value={values.vagas_planilha}
            onChange={(e) => set("vagas_planilha", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="rounded-xl bg-seice-info-soft px-4 py-3 text-[14px] font-semibold text-seice-info">
        Vagas restantes estimadas após salvar: <strong>{vagasRestantesPreview}</strong>{" "}
        {turma ? `(considerando ${turma.pre_matriculas_recebidas} intenção(ões) já recebida(s))` : ""}
      </div>

      <div className="mt-1 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border-[1.5px] border-seice-border bg-seice-panel px-5 py-3 text-[15.5px] font-bold text-seice-ink transition hover:border-seice-gold/20"
        >
          Cancelar
        </button>
        <Button type="submit" disabled={salvando} className="!px-6 !py-3">
          {salvando ? "Salvando..." : turma ? "Salvar alterações" : "Criar turma"}
        </Button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border-[1.5px] border-seice-border-strong bg-seice-deep-soft px-3.5 py-2.5 text-[15.5px] text-seice-ink outline-none focus:border-seice-gold focus:ring-4 focus:ring-seice-gold/10";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-[14px] font-bold text-seice-ink">{label}</span>
      {children}
      {hint && <span className="text-[12.5px] text-seice-muted">{hint}</span>}
    </label>
  );
}
