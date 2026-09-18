import { useState } from "react";
import { RotateCcw, Settings2 } from "lucide-react";
import { resetarDadosTeste } from "../../lib/adminApi";
import { Button, Card } from "../ui";
import ConfirmModal from "./ConfirmModal";

/**
 * Tela só pra quem loga como admin@seice.com.br. O botão de reset é pensado
 * pra fase de testes, antes do lançamento oficial: apaga as intenções de
 * matrícula atuais (não mexe em turmas nem no resto da configuração) e
 * reinicia a senha sequencial em 01 — não é um "apagar tudo do sistema".
 */
export default function ConfiguracoesTab({ token, onReset }: { token: string; onReset: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [resetando, setResetando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function resetar() {
    setResetando(true);
    setErro(null);
    try {
      await resetarDadosTeste(token);
      setFeito(true);
      onReset();
      setTimeout(() => setFeito(false), 3000);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível resetar os dados");
    } finally {
      setResetando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[22.5px] font-semibold tracking-tight text-seice-ink">Configurações</h2>
        <p className="text-[15px] text-seice-muted">Ferramentas administrativas do painel geral.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3.5">
          <span className="icon-tile-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <Settings2 size={20} />
          </span>
          <div>
            <div className="text-[16.5px] font-bold text-seice-ink">Resetar dados de teste</div>
            <p className="mt-1 text-[14.5px] leading-relaxed text-seice-muted">
              Apaga todas as intenções de matrícula recebidas até agora e reinicia a numeração da senha em{" "}
              <strong className="text-seice-ink">01</strong>. Use isso pra limpar os testes antes do lançamento
              oficial — turmas, vagas e as configurações do painel não são afetadas.
            </p>
          </div>
        </div>

        {erro && (
          <div className="rounded-xl border border-seice-danger/30 bg-seice-danger-soft px-4 py-3 text-[14.5px] text-seice-danger">
            {erro}
          </div>
        )}

        <Button
          variant="dark"
          className="!self-start !bg-seice-danger hover:!brightness-110"
          onClick={() => setConfirmando(true)}
          disabled={resetando}
        >
          <RotateCcw size={16} /> {feito ? "Dados resetados!" : "Resetar dados de teste"}
        </Button>
      </Card>

      <ConfirmModal
        open={confirmando}
        onClose={() => setConfirmando(false)}
        title="Resetar dados de teste"
        message="Isso vai apagar TODAS as intenções de matrícula cadastradas até agora (de teste ou não) e reiniciar a senha para 01. Essa ação não pode ser desfeita."
        confirmLabel="Sim, resetar"
        onConfirm={resetar}
      />
    </div>
  );
}

