import type { DesignerNote as DesignerNoteContent } from "@/types/content";

export function DesignerNote({ note }: { note: DesignerNoteContent }) {
  return (
    <section className={`designer-note designer-note-${note.status}`}>
      <div className="designer-note-heading">
        <p className="eyebrow">Notes from the designer</p>
        <p className="designer-credit">{note.designer}<span>{note.role}</span></p>
      </div>
      <div className="designer-note-copy">
        <h2>{note.headline}</h2>
        {note.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {note.status === "pending" && <span className="designer-note-status">Editorial note in progress</span>}
      </div>
    </section>
  );
}
