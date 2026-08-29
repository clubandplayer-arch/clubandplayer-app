# Canonical geography imports

Geography is never downloaded during build or runtime. Every import requires a reviewed, versioned local
file plus explicit `sourceLicense` and `datasetVersion` values. Dataset URLs are provenance text only.

## Official-source staging contract

Raw CSV, JSON or XML must first be transformed, after checking the real release headers, into a JSON object
whose `records` use `OfficialGeoStagingRecord`: `countryIso2`, `areaType`, `officialCode`, `officialName`,
optional `parentOfficialCode` with `parentAreaType`, coordinates, bounds, source timestamp and metadata.
The wrapper may include `datasetPublishedAt`, `sourceUrlIdentifier`, and optional per-type `expected` min/max
counts. No raw-source column names are assumed by Phase 3B-E1.

```sh
pnpm geo:dry-run --country FR --file imports/geo/FR.staging.json --license LICENSE-ID --dataset-version VERSION
```

The report includes provider/version, counts by area type, invalid records, duplicate IDs/codes, missing or
cross-country parents, cycles, unsupported types, invalid coordinates/bounds, projected inserts/updates and
potentially obsolete DB identities when an existing-record snapshot is supplied to the pipeline. It never
deletes, deactivates or writes records.

## FR — INSEE COG

- Provider `fr_insee_cog`; authority `FR_INSEE_COG`.
- `REGION` (1) → `DEPARTMENT` (2) → `COMMUNE` (3).
- IDs: `region:<code>`, `department:<code>`, `commune:<code>`.
- Obtain the reviewed INSEE Code officiel géographique release containing official region, department and
  commune codes/names and their parent codes. Confirm the release's real headers during preprocessing.

## ES — INE

- Provider `es_ine`; authority `ES_INE`.
- `AUTONOMOUS_COMMUNITY` (1) → `PROVINCE` (2) → `MUNICIPALITY` (3).
- IDs use `autonomous-community:`, `province:` and `municipality:` namespaces.
- Obtain the reviewed INE release for official autonomous-community, province and municipality codes/names
  and relations; confirm the exact source headers before creating staging.

## CH — BFS/swisstopo

- Provider `ch_bfs`; authority `CH_BFS`.
- `CANTON` (1) → optional `DISTRICT` (2) → `MUNICIPALITY` (3), or directly `CANTON` (1) → `MUNICIPALITY` (2).
- IDs use `canton:`, `district:` and `municipality:`. Missing districts are never invented.
- Obtain a reviewed BFS/swisstopo release with official codes, names and explicit canton/district relations.

## SI — GURS/SURS

- Provider `si_gurs_surs`; authority `SI_GURS`.
- `STATISTICAL_REGION` (1) → `MUNICIPALITY` (2); settlements and lower objects are excluded.
- IDs use `statistical-region:` and `municipality:`.
- Obtain reviewed GURS/SURS releases that jointly establish official statistical-region and municipality
  codes/names and their relationship; confirm whether preprocessing needs a documented join.

## PL — GUS/TERYT

- Provider `pl_gus_teryt`; authority `PL_TERYT`.
- `VOIVODESHIP` (1) → `POWIAT` (2) → `GMINA` (3).
- IDs use `voivodeship:`, `powiat:` and `gmina:`.
- Obtain the reviewed GUS TERYT/TERC release containing official codes, names and hierarchy; confirm its
  actual headers and encoding during preprocessing.

## CountryStateCity fallback

The existing `geo:import:csc` local-export adapter remains available as a fallback utility. It is not the
primary source for FR, ES, CH, SI or PL and performs no download or production write.

## Phase 3B-E3 production preparation

The reviewed command is country-scoped and defaults to a local, read-only preview:

```sh
pnpm geo:import --country FR --file imports/geo/staging/FR.staging.json --dry-run
```

Use `--check-existing` with server-side environment credentials to include the current Production identities in a read-only preview. A future write requires the explicit `--apply` flag; omitting it can never write:

```sh
pnpm geo:import --country FR --file imports/geo/staging/FR.staging.json --dry-run --check-existing
pnpm geo:import --country FR --file imports/geo/staging/FR.staging.json --apply
```

Before every write, the command validates the approved exact manifest, provenance, hierarchy, provider identity, parents, cycles, supported types and duplicates. Records are ordered and batched by complete hierarchy level, so every parent level finishes before its children begin. A batch failure stops later batches, reports the unfinished count, and is recoverable by rerunning the idempotent command. Existing identities are updated in place, preserving their Club and Player UUIDs; absent identities are inserted with database-generated UUIDs. Missing records are reported but never deleted, deactivated, or written outside `geo_areas`.

Batches are separate server requests because no database RPC or schema change is introduced in Phase 3B-E3. Each insert request is atomic; successful earlier parent batches remain explicitly visible if a later child batch fails, and the non-zero failure report prevents treating that country as complete. Operators must verify the final report (`inserted`, `updated`, `unchanged`, `failed`, type counts, missing parents, provider, version and license) before moving to the next country.
