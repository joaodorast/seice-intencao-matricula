import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Mesmo esquema de autenticação do admin-pre-matriculas: o painel manda um
// token no header `x-admin-token`, aqui comparamos o hash SHA-256 dele com o
// hash guardado em public.app_config (chave 'admin_token_hash'). Nunca
// guardamos o token em texto puro.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const NIVEIS_VALIDOS = ["infantil", "fund1", "fund2", "medio"];
const TURNOS_VALIDOS = ["M", "T"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const token = req.headers.get("x-admin-token") ?? "";
  const { data: cfg, error: cfgError } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "admin_token_hash")
    .maybeSingle();

  if (cfgError || !cfg) {
    return json({ error: "Configuração de acesso indisponível" }, 500);
  }

  const tokenHash = token ? await sha256Hex(token) : "";
  if (!token || tokenHash !== cfg.value) {
    return json({ error: "Não autorizado" }, 401);
  }

  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const unidade = url.searchParams.get("unidade");

      let turmasQuery = supabase
        .from("turmas")
        .select("*")
        .order("unidade_id", { ascending: true })
        .order("ordem", { ascending: true })
        .order("codigo", { ascending: true });
      if (unidade) turmasQuery = turmasQuery.eq("unidade_id", unidade);

      const [{ data: turmas, error: turmasErr }, { data: matriculas, error: matriculasErr }] =
        await Promise.all([
          turmasQuery,
          supabase
            .from("pre_matriculas")
            .select("turma_id, status")
            .neq("status", "cancelado")
            .eq("lista_espera", false),
        ]);

      if (turmasErr) return json({ error: turmasErr.message }, 500);
      if (matriculasErr) return json({ error: matriculasErr.message }, 500);

      const contagem = new Map<string, number>();
      for (const m of matriculas ?? []) {
        contagem.set(m.turma_id, (contagem.get(m.turma_id) ?? 0) + 1);
      }

      const resultado = (turmas ?? []).map((t) => {
        const recebidas = contagem.get(t.id) ?? 0;
        return {
          ...t,
          pre_matriculas_recebidas: recebidas,
          vagas_restantes: Math.max(t.vagas_planilha - recebidas, 0),
        };
      });

      return json({ data: resultado });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Corpo inválido" }, 400);

      const {
        unidade_id,
        nivel,
        serie,
        serie_full,
        ordem,
        codigo,
        turno,
        curso,
        capacidade,
        matriculados,
        vagas_planilha,
        ano_letivo,
      } = body;

      if (!unidade_id || !NIVEIS_VALIDOS.includes(nivel) || !serie || !serie_full || !codigo) {
        return json({ error: "Preencha unidade, nível, série, série completa e código da turma" }, 400);
      }
      if (!TURNOS_VALIDOS.includes(turno)) {
        return json({ error: "Turno deve ser M (manhã) ou T (tarde)" }, 400);
      }

      const { data, error } = await supabase
        .from("turmas")
        .insert({
          unidade_id,
          nivel,
          serie,
          serie_full,
          ordem: ordem ?? 0,
          codigo: String(codigo),
          turno,
          curso: curso || null,
          capacidade: Number(capacidade) || 0,
          matriculados: Number(matriculados) || 0,
          vagas_planilha: Number(vagas_planilha) || 0,
          ano_letivo: ano_letivo ?? 2027,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ data }, 201);
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const id = body?.id;
      if (!id) return json({ error: "Informe o id da turma" }, 400);

      const campos = [
        "unidade_id",
        "nivel",
        "serie",
        "serie_full",
        "ordem",
        "codigo",
        "turno",
        "curso",
        "capacidade",
        "matriculados",
        "vagas_planilha",
        "ano_letivo",
      ];
      const updates: Record<string, unknown> = {};
      for (const campo of campos) {
        if (campo in body) updates[campo] = body[campo];
      }
      if (Object.keys(updates).length === 0) {
        return json({ error: "Nenhum campo para atualizar" }, 400);
      }

      const { data, error } = await supabase
        .from("turmas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id") ?? (await req.json().catch(() => ({})))?.id;
      if (!id) return json({ error: "Informe o id da turma" }, 400);

      const { error } = await supabase.from("turmas").delete().eq("id", id);
      if (error) {
        const emUso = /foreign key|violat/i.test(error.message);
        return json(
          {
            error: emUso
              ? "Não é possível excluir: já existem pré-matrículas para esta turma."
              : error.message,
          },
          emUso ? 409 : 500
        );
      }
      return json({ ok: true });
    }

    return json({ error: "Método não suportado" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
