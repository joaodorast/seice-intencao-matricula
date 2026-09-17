import { Lock } from "lucide-react";

// O link para o painel (/admin) foi tirado de propósito do rodapé público —
// não é algo que um visitante qualquer precise encontrar. Quem trabalha na
// secretaria já sabe o endereço; aqui fica só um contato de verdade.
const EMAIL_SECRETARIA = "secretaria@seice.com.br";

export default function Footer() {
  return (
    <div className="mt-10 flex flex-col items-center gap-2 pb-4 text-center">
      <div className="flex items-center gap-1.5 text-[14.5px] font-medium text-seice-muted">
        <Lock size={13} />
        Ambiente seguro — seus dados não são compartilhados com terceiros.
      </div>
      <div className="text-[14.5px] text-seice-muted">
        Dúvidas? Fale com a secretaria da sua unidade ·{" "}
        <a href={`mailto:${EMAIL_SECRETARIA}`} className="font-semibold text-seice-ink underline-offset-2 hover:underline">
          {EMAIL_SECRETARIA}
        </a>
      </div>
    </div>
  );
}
