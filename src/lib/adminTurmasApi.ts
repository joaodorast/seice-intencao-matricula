import { ADMIN_TURMAS_URL } from "../config";
import type { TurmaAdminRow, TurmaFormValues } from "../types";

async function call(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${ADMIN_TURMAS_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro (${res.status})`);
  return body;
}

export async function listarTurmas(token: string, unidadeSlug?: string): Promise<TurmaAdminRow[]> {
  const qs = unidadeSlug && unidadeSlug !== "todas" ? `?unidade=${unidadeSlug}` : "";
  const body = await call(token, qs);
  return body.data || [];
}

export async function criarTurma(token: string, values: TurmaFormValues): Promise<TurmaAdminRow> {
  const body = await call(token, "", { method: "POST", body: JSON.stringify(values) });
  return body.data;
}

export async function atualizarTurma(
  token: string,
  id: string,
  updates: Partial<TurmaFormValues>
): Promise<TurmaAdminRow> {
  const body = await call(token, "", { method: "PATCH", body: JSON.stringify({ id, ...updates }) });
  return body.data;
}

export async function excluirTurma(token: string, id: string): Promise<void> {
  await call(token, "", { method: "DELETE", body: JSON.stringify({ id }) });
}
