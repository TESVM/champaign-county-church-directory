# Importing church records safely

The researched records live in `lib/data/mock.ts` (70 real churches; six
invented development fixtures are marked `isFixture: true` and are never
imported). `scripts/import-churches.ts` copies them into Postgres.

## Rules the importer follows

- **Dry run by default.** Without `--apply` it prints the plan and writes nothing.
- **Never overwrites newer database data.** A church is skipped if it was edited
  in the app after its last import, is newer in the database than in the file,
  is managed by a church (claimed), or was confirmed by church leadership.
  Skips are listed with the reason.
- **Updates only when the file is newer** (`lastUpdatedAt`) than what was imported.
- **Never creates** users, claims, memberships, subscriptions, or premium grants.
  (The old seed inserted invented claim requests and accounts; that is gone.)
- Records `verified: true` entries as *checked against a public source* on their
  `lastUpdatedAt`, with the website as the source URL.
- Attaches photo provenance from `CHURCH_IMAGE_SOURCES.md` (source URL and
  note) to imported photos.
- Skips placeholder pastor names such as “Leadership not publicly listed”.
- Keeps Apple App Store, Google Play, livestream, and each social link as
  separate fields.

## Steps

```bash
pg_dump "$DATABASE_URL" --format=custom --file=before-import.dump   # backup
DATABASE_URL=... npx tsx scripts/import-churches.ts                  # review plan
DATABASE_URL=... npx tsx scripts/import-churches.ts --apply
```

Every created/updated church gets an Audit log entry (`church.imported` /
`church.import_updated`, actor `system:import`).

## After launch

Treat the database as the source of truth. Correct listings in the admin or
church dashboard, not in `mock.ts`. If you research new churches offline, add
them to `mock.ts` with a current `lastUpdatedAt` and run the importer again; it
will create only the new ones and leave edited listings alone.
