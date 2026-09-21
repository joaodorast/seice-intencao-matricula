// ============================================================================
// CONFIGURAÇÃO DO SISTEMA DE PRÉ-MATRÍCULA SEICE — 2027
// Edite este arquivo para ajustar números de WhatsApp e credenciais.
// ============================================================================
import type { NivelConfig, Unidade } from "./types";

export const SUPABASE_URL = "https://sosdutufoexofznjzrxw.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvc2R1dHVmb2V4b2Z6bmp6cnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzI4MjMsImV4cCI6MjEwNTAwODgyM30.kjZmUA_Zyf3sw0NhuMzYqcuBBB-YdcOvGahnRWB4o7o";

// Endpoint da função de administração (painel da secretaria).
export const EDGE_FUNCTION_URL =
  "https://sosdutufoexofznjzrxw.supabase.co/functions/v1/admin-pre-matriculas";

// Endpoint de administração das turmas (criar, editar vagas/capacidade, excluir).
export const ADMIN_TURMAS_URL =
  "https://sosdutufoexofznjzrxw.supabase.co/functions/v1/admin-turmas";

// Envia o comprovante da intenção de matrícula por e-mail (reforço caso a
// família esqueça de imprimir/salvar a tela de confirmação).
export const EMAIL_COMPROVANTE_URL =
  "https://sosdutufoexofznjzrxw.supabase.co/functions/v1/enviar-comprovante-email";

// ---------------------------------------------------------------------------
// >>> TROQUE AQUI OS NÚMEROS DE WHATSAPP DE CADA SECRETARIA <<<
// Formato: código do país (55) + DDD + número, só dígitos.
// Exemplo real: "5511987654321"
// ---------------------------------------------------------------------------
export const UNIDADES: Unidade[] = [
  {
    slug: "campos-eliseos",
    nome: "Campos Elíseos",
    whatsapp: "5500000000000", // TODO: número da secretaria de Campos Elíseos
  },
  {
    slug: "jardim-primavera",
    nome: "Jardim Primavera",
    whatsapp: "5500000000000", // TODO: número da secretaria de Jardim Primavera
  },
];

export const NIVEIS: NivelConfig[] = [
  {
    key: "infantil",
    label: "Educação Infantil",
    desc: "Maternal, Pré I e Pré II",
  },
  {
    key: "fund1",
    label: "Ensino Fundamental I",
    desc: "1º ao 5º ano",
  },
  {
    key: "fund2",
    label: "Ensino Fundamental II",
    desc: "6º ao 9º ano",
  },
  {
    key: "medio",
    label: "Ensino Médio",
    desc: "Técnico — 1º ao 3º ano — Informática, Enfermagem e Administração",
  },
];

export const NIVEL_LABELS: Record<string, string> = Object.fromEntries(
  NIVEIS.map((n) => [n.key, n.label])
);
