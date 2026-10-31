import { FAQ_ITEMS } from "@/lib/faq-data";
import QAAccordion from "../QAAccordion";

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Pertanyaan yang sering masuk</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">Dijawab sales di jam 08.00–17.00 WIB</p>
      <div className="mt-5">
        <QAAccordion items={FAQ_ITEMS} />
      </div>
    </div>
  );
}
