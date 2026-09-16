import { Building2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { UNIDADES } from "../../config";
import { Card, SectionDesc, SectionEyebrow, SectionTitle } from "../ui";

export default function UnidadeStep({ onPick }: { onPick: (slug: string) => void }) {
  return (
    <Card>
      <SectionEyebrow>Passo 1 de 6</SectionEyebrow>
      <SectionTitle>Em qual unidade seu filho vai estudar?</SectionTitle>
      <SectionDesc>Escolha a unidade SEICE para ver as séries e turmas com vaga.</SectionDesc>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {UNIDADES.map((u, i) => (
          <motion.button
            key={u.slug}
            type="button"
            onClick={() => onPick(u.slug)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.985 }}
            className="raised-surface group flex items-center gap-4 rounded-xl border border-seice-border p-4 text-left transition hover:-translate-y-0.5 hover:border-seice-border-strong hover:shadow-[0_14px_30px_-18px_rgba(20,22,27,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-seice-gold/15 sm:p-5"
          >
            <span className="icon-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
              <Building2 size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[20px] font-semibold leading-tight text-seice-ink">
                {u.nome}
              </div>
              <div className="mt-0.5 text-[15px] text-seice-muted">Maternal ao Ensino Médio</div>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full icon-tile-soft transition group-hover:bg-seice-gold group-hover:text-seice-gold-ink">
              <ChevronRight size={18} />
            </span>
          </motion.button>
        ))}
      </div>
    </Card>
  );
}
