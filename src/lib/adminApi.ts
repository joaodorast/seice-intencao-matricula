import { EDGE_FUNCTION_URL } from "../config";
import type { PreMatriculaAdminRow, StatusPreMatricula } from "../types";

async function call(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
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

export async function verificarToken(token: string): Promise<boolean> {
  try {
    await call(token, "");
    return true;
  } catch {
    return false;
  }
}

export async function buscarPreMatriculas(
  token: string,
  unidadeSlug?: string
): Promise<PreMatriculaAdminRow[]> {
  const qs = unidadeSlug && unidadeSlug !== "todas" ? `?unidade=${unidadeSlug}` : "";
  const body = await call(token, qs);
  return body.data || [];
}

export async function atualizarStatus(
  token: string,
  id: string,
  status: StatusPreMatricula
): Promise<void> {
  await call(token, "", { method: "PATCH", body: JSON.stringify({ id, status }) });
}
