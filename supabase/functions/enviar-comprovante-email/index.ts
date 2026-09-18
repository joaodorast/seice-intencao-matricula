// Manda o comprovante da intenção de matrícula por e-mail, como reforço caso
// a família esqueça de salvar/imprimir a tela de confirmação.
//
// Não confia em nada que vem do cliente além de "qual registro" (unidade +
// senha): o conteúdo do e-mail é sempre montado a partir do que está de fato
// gravado no banco (via service role), não do que o front manda — assim essa
// função não vira um jeito de mandar e-mail arbitrário pra qualquer endereço.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function unidadeNome(slug: string): string {
  return slug === "campos-eliseos" ? "Campos Elíseos" : slug === "jardim-primavera" ? "Jardim Primavera" : slug;
}

function turnoLabel(t: string): string {
  return t === "M" ? "Manhã" : t === "T" ? "Tarde" : t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, erro: "method_not_allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { unidade_id, numero_senha } = await req.json();
    if (!unidade_id || !numero_senha) {
      return new Response(JSON.stringify({ ok: false, erro: "dados_incompletos" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: registro } = await supabase
      .from("pre_matriculas")
      .select(
        "email, aluno_nome, responsavel_nome, telefone1, numero_senha, unidade_id, lista_espera, turmas(codigo, serie, turno, curso)",
      )
      .eq("unidade_id", unidade_id)
      .eq("numero_senha", numero_senha)
      .single();

    // sem registro correspondente, ou família não deixou e-mail: não é erro,
    // simplesmente não há pra quem mandar
    if (!registro || !registro.email) {
      return new Response(JSON.stringify({ ok: false, motivo: "sem_email" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const senhaFmt = String(registro.numero_senha).padStart(2, "0");
    const turma = registro.turmas as { codigo: string; serie: string; turno: string; curso: string | null } | null;
    const resumoTurma = turma
      ? `${turma.serie} — Turma ${turma.codigo} (${turnoLabel(turma.turno)})${turma.curso ? " — " + turma.curso : ""}`
      : "";

    const listaEspera = registro.lista_espera === true;
    const mensagem = listaEspera
      ? `As vagas da turma escolhida para <strong>${registro.aluno_nome}</strong> já foram preenchidas, mas os
         dados foram cadastrados na <strong>lista de espera</strong> da unidade
         <strong>${unidadeNome(registro.unidade_id)}</strong>. Se surgir uma desistência, a secretaria entra em
         contato para oferecer a vaga.`
      : `Recebemos a intenção de matrícula de <strong>${registro.aluno_nome}</strong> para a unidade
         <strong>${unidadeNome(registro.unidade_id)}</strong>. Guarde esta senha — a secretaria vai entrar em
         contato para dar continuidade.`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color:#14161b;">
        ${
          listaEspera
            ? `<div style="background:#e8e8e8; padding:8px 26px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.06em; text-align:center; border-radius:14px 14px 0 0;">Lista de espera</div>`
            : ""
        }
        <div style="background:#0b0b0b; padding:22px 26px; ${listaEspera ? "" : "border-radius:14px 14px 0 0;"}">
          <span style="color:#ffc800; font-weight:bold; font-size:13px; letter-spacing:0.08em; text-transform:uppercase;">Colégio SEICE</span>
          <div style="color:#ffffffb3; font-size:12px; margin-top:6px;">Senha de atendimento</div>
          <div style="color:#ffc800; font-family: 'Courier New', monospace; font-size:28px; font-weight:bold;">${senhaFmt}</div>
        </div>
        <div style="border:1px solid #e5e5e5; border-top:none; padding:22px 26px; border-radius:0 0 14px 14px;">
          <p style="font-size:15px; line-height:1.5; margin:0 0 16px;">${mensagem}</p>
          <table style="width:100%; font-size:14px; border-collapse:collapse;">
            <tr><td style="color:#6b6b6b; padding:5px 0;">Turma</td><td style="text-align:right; font-weight:bold;">${resumoTurma}</td></tr>
            <tr><td style="color:#6b6b6b; padding:5px 0;">Responsável</td><td style="text-align:right; font-weight:bold;">${registro.responsavel_nome}</td></tr>
            <tr><td style="color:#6b6b6b; padding:5px 0;">Telefone</td><td style="text-align:right; font-weight:bold;">${registro.telefone1}</td></tr>
          </table>
        </div>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Colégio SEICE <onboarding@resend.dev>",
        to: registro.email,
        subject: listaEspera
          ? `Você entrou na lista de espera — Senha ${senhaFmt}`
          : `Intenção de matrícula recebida — Senha ${senhaFmt}`,
        html,
      }),
    });

    if (!resendResp.ok) {
      console.error("Resend error:", await resendResp.text());
      return new Response(JSON.stringify({ ok: false, motivo: "falha_envio" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, motivo: "erro_interno" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
