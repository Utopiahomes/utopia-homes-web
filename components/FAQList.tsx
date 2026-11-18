import type { FAQ } from "@/types/content";
export function FAQList({ items, open = false }: { items: FAQ[]; open?: boolean }) { return <div className="faq-list">{items.map((item, index) => <details key={item.id} open={open}><summary><span>{String(index + 1).padStart(2, "0")}</span>{item.question}</summary><p>{item.answer}</p></details>)}</div>; }
