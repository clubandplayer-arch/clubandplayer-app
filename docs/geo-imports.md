# Canonical geography imports

Foreign geography is never downloaded during build or at runtime. An import requires a reviewed, local,
versioned JSON export and explicit provider and license identifiers.

For the CountryStateCity-compatible adapter, the file is a JSON array with `id`, `name`, `country_code`,
`parent_id`, `area_type`, and `level`. Optional fields are `code`, `code_authority`, `latitude`, `longitude`,
`source_updated_at`, and `metadata`.

Run a validation-only report with:

```sh
pnpm geo:import:csc --file imports/geo/FR.json --country FR --provider reviewed-csc-export --license LICENSE-ID --dry-run
```

The report includes input, valid and invalid totals, duplicate provider IDs, missing parents, cycles,
unsupported area types, and projected inserts and updates. The CLI intentionally performs no database
write. Production execution must explicitly inject a privileged `GeoImportRepository` into
`executeGeoImport`; it is never run by build or deployment scripts.

No approved FR, ES, CH, SI, or PL dataset is currently stored in this repository, so no foreign records
are imported by Phase 3B.
