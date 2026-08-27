# ADR 0001: Utopia Design V1 scope and content architecture

- **Status:** Accepted
- **Date:** 2026-08-26
- **Decision owners:** Ray DeLuca and Lyra

## Context

The approved Utopia Design specification expands the public site from a design-interest form into audience-specific marketing journeys and a structured Quote Studio. The repository previously treated pricing as out of scope and used `/utopia-interiors` as the public route.

## Decision

1. `/design` is the canonical public route. `/utopia-interiors` and `/property-enhancement` permanently redirect to `/design`.
2. Preliminary pricing is in V1. The engine returns exact, nonbinding estimates for budgeting; it does not collect payment or create a binding proposal.
3. Marketing content remains validated, version-controlled repository content exposed through `CmsAdapter` for V1. No external CMS is introduced yet.
4. Pricing configuration is separated from marketing content and presentation components. Every generated quote retains the immutable pricing-rule version used to create it.
5. A future CMS may replace the repository adapter without rewriting routes or components. Pricing administration remains a separately authorized workflow.

## Consequences

- The initial release can use the existing deployment and content-validation model.
- Marketing edits require a reviewed deployment in V1.
- Quote Studio persistence, uploads, email, and scheduling require explicit server-side controls and phased implementation.
- Existing links retain compatibility through permanent redirects.

## Governing specification

See `docs/utopia-design-implementation-spec.md`.
