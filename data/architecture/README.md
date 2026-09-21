# Architecture reference library

This is a **retrieval dataset**, not a fine-tuned model or a library of fixed CAD presets. On a design request, both inference paths receive relevant real-world examples before they generate a new `create_design` assembly. The model can vary the design instead of selecting a prebuilt shape. The reference-search tool exposes the same data for browsing.

## Data and provenance

- `references.json`: Wikidata names, categories, coordinates, and available building facts. Each ID resolves to `https://www.wikidata.org/wiki/<ID>`. Wikidata structured data is [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing).
- `cities.json`: GeoNames populated places with recorded population **strictly greater than 200,000**, excluding sections of populated places and historical/abandoned/destroyed places. [GeoNames data](https://download.geonames.org/export/dump/) is [CC BY 4.0](https://www.geonames.org/about.html). This is an adapted subset; name, country, coordinates, population, and record-modified date are retained. Attribution: GeoNames.
- `design-notes.json`: short architectural observations linked to architect/owner pages, plus our separate approximate suggestions for translating them into primitive geometry. Those suggestions are **not measured plans**. No photographs, blueprints, or full articles are included.
- `coverage.json`: exact imported counts, league/team/venue links, failed queries, and cities with/without nearby examples. This manifest deliberately does not assert exhaustive worldwide coverage.

A city match means the closest indexed populated-place center within 25 km. It is **not** a municipal-boundary determination. Population dates vary; a record's modification date is not necessarily its population census date. Cities absent from GeoNames or below its recorded threshold are not silently invented. A city inventory entry does not count as a local architectural example.

The importer covers direct stadium, arena, residential-building, and skyscraper classes; skyscraper subclasses with reported normalized height >=300 m; venue links for the configured major leagues; general city buildings are collected by the separate city-example importer. A reported height is not necessarily a verified CTBUH architectural height. Proposed, historical, demolished, and stale records can occur. Missing values stay missing. Residential records include houses and apartments, **not exclusively condominium ownership**. Team membership and venue statements with a recorded past end date or future start date are excluded, but undated statements can still be stale. League counts are indexed source records, not audited current rosters.

## Refresh

From the repository root:

```sh
python3 scripts/import-architecture-references.py
```

Requires Python 3 standard library and network access. Responses are cached in `/tmp/sight3d-architecture-import`; `--refresh` clears that cache. Metadata queries use at most two concurrent requests and respect HTTP 429 delays. `--strict` refuses publication if any query fails. Without it, partial results are published with the errors preserved in `coverage.json`. Inspect that manifest before committing a refreshed snapshot. Runtime search is offline; user prompts are not sent to the source websites.

The configured league inventory spans North American football/baseball/basketball/hockey/soccer, leading European football leagues, Brazilian/Argentine/Mexican/Saudi/Japanese/Australian football, cricket, Australian football, and rugby. Missing teams or venue links remain visible in the manifest. This does **not** certify every current top-league team's stadium, every supertall, or building examples in every city.

## What these examples can teach at inference time

Retrieved facts and researched shape notes ground the choice of reference. Small coordinate exercises explain supported stacking, balcony overlap with a continuous core, and stadium stands placed outside the field. These exercises use invented dimensions and are labeled as such. The language model still creates the final parts; source metadata alone does not supply a facade, roof, footprint, or image-based reconstruction. Receipts cite recognized source IDs, and invalid IDs fail before geometry is changed.

### Team-directory supplement

`team-venues.json` and `team-coverage.json` add a separate team-directory snapshot for 20 leagues. `python3 scripts/import-team-venues.py` refreshes it (responses cached under `/tmp/sight3d-team-import`). Factual team/venue names come from ESPN's public team directory and MLB's official Stats API; source URLs are stored per record. No logos, photographs, article text, or claim of an open-content license is included. Known conflicting Clippers data is corrected using the official Intuit Dome website. The directory is not infallible: missing venues remain explicit, and other stale links may still exist. Directory team links take precedence over matching undated Wikidata links in retrieval.

### Supertall list supplement

`supertalls.json` imports every row from the fetched completed/topped-out supertall table and completed megatall table. `supertall-coverage.json` records per-table row counts. Refresh with `python3 scripts/import-supertalls.py`; it rejects changed table layouts instead of silently misaligning heights and cities. Attribution: Wikipedia contributors, [List of supertall skyscrapers](https://en.wikipedia.org/wiki/List_of_supertall_skyscrapers) and [List of megatall skyscrapers](https://en.wikipedia.org/wiki/List_of_megatall_skyscrapers), adapted factual table subset under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Source tables can contain errors or incomplete status information. No claim is made that they are a complete audited inventory of the world. Search deduplicates matching display names across sources; total source-record counts are not counts of unique physical buildings.

### City samples and combined report

`city-examples.json` supplements proximity matching with one named building sample per city where Wikidata records a direct administrative-location relation to the city's GeoNames-linked item. `city-example-coverage.json` tracks successes and failures. Run `python3 scripts/import-city-examples.py` after the main importer. These CC0 Wikidata samples are often metadata-only; they are not citywide surveys.

After refreshing all snapshots, run `python3 scripts/report-architecture-coverage.py` to regenerate [COVERAGE.md](COVERAGE.md), including the combined city gaps and missing team-directory links. A city reference from either method counts toward combined city coverage, but overlapping source records are not claimed as distinct physical buildings.
