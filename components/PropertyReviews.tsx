import type { PropertyReviewSummary } from "@/types/content";

export function PropertyReviews({ summary }: { summary?: PropertyReviewSummary }) {
  if (!summary) return null;

  return <section className="property-reviews" aria-labelledby="guest-notes-title">
    <div className="review-summary">
      <p className="eyebrow">Guest notes</p>
      <div className="review-score"><strong>{summary.rating.toFixed(2)}</strong><span>out of 5</span></div>
      <p><strong>{summary.count} verified reviews</strong> on <a href={summary.sourceUrl} target="_blank" rel="noreferrer">{summary.sourceLabel} <span aria-hidden="true">↗</span></a></p>
    </div>
    <div className="review-editorial">
      <h2 id="guest-notes-title">Loved by<br /><em>full houses.</em></h2>
      <ol className="review-highlights">
        {summary.highlights.map((highlight, index) => <li key={highlight}><span>{String(index + 1).padStart(2, "0")}</span><p>{highlight}</p></li>)}
      </ol>
      <p className="review-disclosure">{summary.editorialNote} Aggregate verified {summary.lastVerifiedAt}.</p>
    </div>
  </section>;
}
