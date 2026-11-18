import Link from "next/link";
import type { ReactNode } from "react";
import { dogsLabel, parkingLabel, stayFacts } from "@/lib/stay-facts";
import type { Property, StayGuideRow } from "@/types/content";

function airbnbRating(property: Property): ReactNode {
  const summary = property.sourceAudit.reviewRights === "approved" ? property.reviewSummary : undefined;
  if (!summary) return "Not listed";
  return <a href={summary.sourceUrl} target="_blank" rel="noreferrer">{summary.rating.toFixed(2)} from {summary.count} reviews on {summary.sourceLabel} <span aria-hidden="true">↗</span></a>;
}

// The roles are explicit because the phone layout stacks this table, and browsers drop table
// semantics from cells that stop displaying as table cells.
export function StayComparisonTable({ caption, homes, extraRows }: { caption: string; homes: Property[]; extraRows: StayGuideRow[] }) {
  const columns = homes.map((property) => ({ property, facts: stayFacts(property) }));
  const rows: Array<{ label: string; cell: (column: (typeof columns)[number]) => ReactNode }> = [
    { label: "Town", cell: ({ facts }) => facts.city },
    { label: "Guests", cell: ({ facts }) => `Up to ${facts.guests}` },
    { label: "Bedrooms", cell: ({ facts }) => facts.bedrooms },
    { label: "Beds", cell: ({ facts }) => facts.beds },
    { label: "Baths", cell: ({ facts }) => facts.bathrooms },
    { label: "Pool", cell: ({ facts }) => facts.pool ?? "No pool" },
    { label: "Hot tub", cell: ({ facts }) => facts.hotTub ?? "No hot tub" },
    { label: "Parking", cell: ({ facts }) => parkingLabel(facts) },
    { label: "Dogs", cell: ({ facts }) => dogsLabel(facts) },
    ...extraRows.map((row) => ({ label: row.label, cell: ({ facts }: (typeof columns)[number]) => row.values[facts.slug] })),
    { label: "Guest rating", cell: ({ property }) => airbnbRating(property) },
  ];

  return <div className="guide-table-frame">
    <table className="guide-table" role="table">
      <caption>{caption}</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">Compare</th>
          {columns.map(({ facts }) => <th scope="col" role="columnheader" key={facts.slug}><Link href={`/stays/${facts.slug}`}>{facts.name}</Link></th>)}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((row) => <tr role="row" key={row.label}>
          <th scope="row" role="rowheader">{row.label}</th>
          {columns.map((column) => <td role="cell" data-home={column.facts.name} key={column.facts.slug}>{row.cell(column)}</td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
