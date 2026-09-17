export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validEmail(v: string): boolean {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function turnoLabel(t: string): string {
  return t === "M" ? "Manhã" : t === "T" ? "Tarde" : t;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Senha de atendimento: 1 → "01", 2 → "02", ..., 100 → "100". */
export function formatarSenha(numero: number): string {
  return String(numero).padStart(2, "0");
}
