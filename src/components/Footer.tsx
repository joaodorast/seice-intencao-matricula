import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export default function Footer() {
  return (
    <div className="mt-10 flex flex-col items-center gap-2 pb-4 text-center">
      <div className="flex items-center gap-1.5 text-[14.5px] font-medium text-seice-muted">
        <Lock size={13} />
        Ambiente seguro — seus dados não são compartilhados com terceiros.
      </div>
      <div className="text-[14.5px] text-seice-muted">
        Dúvidas? Fale com a secretaria da sua unidade. ·{" "}
        <Link to="/admin" className="font-semibold text-seice-ink underline-offset-2 hover:underline">
          Painel da secretaria
        </Link>
      </div>
    </div>
  );
}
