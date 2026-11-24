# Owner-editable wording

Ray, 2026-11-23: utopiahomes.com is editable from the Stoin owner editor (`app.stoin.ai/owner?site=utopiahomes.com`), like raymonddeluca.com.

- `home.json`: home page wording.
- `house-page.json`: wording shared by every house page.
- `stays.json`: each house's own wording, by slug. Facts code reads (name, guests, parking, pets, Lodgify ids) stay in `content/properties.ts`.

Keep every key; change only the wording. Publishing from the editor runs `scripts/apply-site-edits.mjs`, which changes only these files. The private edit copy (Vercel project `utopia-homes-edit`, `SITE_EDIT_MODE=1`) marks each string so the owner can click it (`lib/edit/`, `editor/`, `app/stoin-edit/`).
