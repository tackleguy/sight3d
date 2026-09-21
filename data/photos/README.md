# Photo reference index

400,000 photo records across 52,536 architectural landmark labels, imported from [Google Landmarks Dataset v2](https://github.com/cvdfoundation/google-landmark). This is an index of actual source photo URLs, not 400,000 downloaded image files. Photos load from Wikimedia when visible or selected. Source IDs and original URLs are unique; identical image content under different URLs has not been deduplicated. Link availability and architectural quality have not been checked for every image.

Metadata and annotations: Google, CC BY 4.0. Adapted subset of the GLDv2 training metadata and hierarchical labels. Each photo retains its original author, source file page, title, and license string from `train_attribution.csv`; selected rows contain a CC BY or CC BY-SA license URL. The authors own their photos. Follow each image's source page for current license terms and attribution. The dataset's authors disclaim independent verification of every image's license.

Source CSVs: `train.csv`, `train_attribution.csv`, `train_label_to_hierarchical.csv`, under `https://s3.amazonaws.com/google-landmark/metadata/`. The importer joins rows by verified image ID, filters human-made architectural labels, caps each landmark at 128 photos, and stops at 400,000 distinct IDs/URLs. This historical sample is not a current survey of every building, team, or city. Churches and historic landmarks are well represented; coverage of modern condos and stadiums varies.

## Runtime

`landmarks.json` is loaded only when photo search starts. The client builds a token index over landmark names/types. It fetches only relevant `photos-XX.json` shards (maximum eight cached in memory), then loads visible thumbnails. The whole photo corpus is not bundled into JavaScript. Web and desktop builds copy these static files to `photos/` beside the application. Hosting must serve that directory; same-origin paths also work below a URL subdirectory.

Photo searches use text labels, not visual embeddings. A selected photo is resized locally to at most 512 pixels and supplied as actual image content to a vision model. The browser offers Phi-3.5 Vision as an explicit optional model download; local inference requires a vision-capable model with structured JSON output. Merely having a photo database does not make the smaller text model see images. Model download/inference latency depends on hardware, and faithful architectural reconstruction is not guaranteed.

Generated commands are limited to one validated `create_design` assembly, with 3–32 parts, supported primitive types, finite bounded dimensions and no below-ground upright parts. No arbitrary script is executed from a photo. Creation is undoable. This gate is not structural engineering or complete visual-quality validation. Successful commands for the exact same photo ID and prompt are cached locally (12 entries, 30 days); repeats reuse the plan without another model call. A plan's successful execution does not establish visual fidelity.

## Reproduce

```sh
python3 scripts/import-photo-library.py
node scripts/verify-photo-library.cjs
```

The importer streams source metadata and downloads no full-resolution image archive. `manifest.json` records the count, source-row count and SHA-256 of every photo shard. Refreshes preserve the requested count or fail; they never pad with synthetic records. Rebuild after refreshing. See [search verification](../../tests/reports/photo-library.json) for actual measured local lookup times.
