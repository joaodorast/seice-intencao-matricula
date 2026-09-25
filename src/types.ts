export type Nivel = "infantil" | "fund1" | "fund2" | "medio";
export type Turno = "M" | "T";
export type StatusPreMatricula = "pendente" | "contatado" | "matriculado" | "cancelado";
export type Passo = "unidade" | "nivel" | "serie" | "turma" | "dados" | "confirmacao";

export interface Unidade {
  slug: string;
  nome: string;
  whatsapp: string;
}

export interface NivelConfig {
  key: Nivel;
  label: string;
  desc: string;
}

export interface TurmaDisponivel {
  id: string;
  unidade_id: string;
  ano_letivo: number;
  nivel: Nivel;
  serie: string;
  serie_full: string;
  ordem: number;
  codigo: string;
  turno: Turno;
  curso: string | null;
  capacidade: number;
  vagas_planilha: number;
  vagas_restantes: number;
  /** Controla se o número de vagas aparece pro responsável no site público
   *  (true) ou se essa turma sempre mostra "Lista de espera" (false) —
   *  configurável pelo admin na tela de Configurações. */
  mostrar_vagas: boolean;
}

export interface SerieGroup {
  ordem: number;
  serie: string;
  serie_full: string;
  turmas: TurmaDisponivel[];
}

export interface PreMatriculaPayload {
  unidade_id: string;
  turma_id: string;
  responsavel_nome: string;
  telefone1: string;
  telefone2: string | null;
  email: string;
  aluno_nome: string;
}

export interface PreMatriculaSubmetida extends PreMatriculaPayload {
  /** Senha de atendimento sequencial (01, 02, 03...), gerada pelo banco. */
  numeroSenha: number;
  resumoTurma: string;
  /** true quando a turma já estava cheia e a intenção entrou na lista de espera. */
  listaEspera: boolean;
  /** Posição por ordem de chegada na lista de espera daquela turma (1ª, 2ª...). null fora da lista de espera. */
  posicaoEspera: number | null;
}

export interface TurmaAdminRow {
  id: string;
  unidade_id: string;
  ano_letivo: number;
  nivel: Nivel;
  serie: string;
  serie_full: string;
  ordem: number;
  codigo: string;
  turno: Turno;
  curso: string | null;
  capacidade: number;
  matriculados: number;
  vagas_planilha: number;
  pre_matriculas_recebidas: number;
  vagas_restantes: number;
  mostrar_vagas: boolean;
  criado_em?: string;
}

export interface TurmaFormValues {
  unidade_id: string;
  nivel: Nivel;
  serie: string;
  serie_full: string;
  ordem: number;
  codigo: string;
  turno: Turno;
  curso: string | null;
  capacidade: number;
  matriculados: number;
  vagas_planilha: number;
  ano_letivo: number;
  mostrar_vagas?: boolean;
}

export interface PreMatriculaAdminRow {
  id: string;
  numero_senha: number;
  criado_em: string;
  unidade_id: string;
  turma_id: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  telefone1: string;
  telefone2: string | null;
  email: string | null;
  aluno_nome: string;
  status: StatusPreMatricula;
  lista_espera: boolean;
  turmas: {
    codigo: string;
    turno: Turno;
    serie: string;
    serie_full: string;
    nivel: Nivel;
    curso: string | null;
  } | null;
}
