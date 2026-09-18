import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Admin auth for the SEICE secretaria panel works without Supabase Auth:
// the admin page sends a token in the `x-admin-token` header, this function
// hashes it (SHA-256) and compares against the hash stored in
// `public.app_config` (key = 'admin_token_hash'). That table has RLS enabled
// with no policies, so only this function's service-role client can read it
// - the plaintext token itself is never stored anywhere, only its hash.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
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
      let query = supabase
        .from("pre_matriculas")
        .select(
          "id, numero_senha, criado_em, unidade_id, turma_id, responsavel_nome, responsavel_cpf, telefone1, telefone2, email, aluno_nome, status, lista_espera, turmas(codigo, turno, serie, serie_full, nivel, curso)",
        )
        .order("criado_em", { ascending: false });

      if (unidade) query = query.eq("unidade_id", unidade);

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const id = body?.id;
      const status = body?.status;
      const allowed = ["pendente", "contatado", "matriculado", "cancelado"];
      if (!id || !allowed.includes(status)) {
        return json({ error: "Parâmetros inválidos: informe id e status válido" }, 400);
      }
      const { error } = await supabase.from("pre_matriculas").update({ status }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      // Botão "resetar dados de teste" da tela de Configurações: apaga as
      // intenções atuais e reinicia a senha sequencial em 01. A função no
      // banco (resetar_dados_teste) faz as duas coisas numa transação só.
      const { error } = await supabase.rpc("resetar_dados_teste");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Método não suportado" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
