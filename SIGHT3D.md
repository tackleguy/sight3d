# Sight3D quick start

Based on the source supplied as `draft-down-main.zip` (archive revision `12f7f43033b9807b019d0c8b9b7980b54467278d`). Original implementation documentation remains in README.md.

## Run

Use Node 20 or newer. Run `npm ci`, then `npm run dev:web` and open http://localhost:3001. For the desktop app, run `npm start`. Production builds: `npm run build` and `npm run build:web`.

## Model by hand

Choose **Start modeling** for a blank model in meters. Quick start explains Rectangle → Push/Pull → Orbit. Type dimensions into Measurements and press Enter. Essential tools appear first; choose **Show all tools** for advanced operations. **Model tray** opens entity information, materials, outliner and layers. **AI assistant** opens the assistant without covering the desktop canvas.

## Model with AI

On the website, choose **Enable browser AI** in the assistant. No account, API key, or local server is needed. The first use downloads approximately 1 GB of model assets from Hugging Face and MLC; the browser caches them when storage permits. Inference and prompts stay on the visitor’s device. A current WebGPU-capable browser, HTTPS (or localhost), and roughly 2–3 GB of available graphics memory are required. Unsupported devices can still model manually. Loading and generation can be slow on modest hardware. This removes inference API fees; hosting and download bandwidth depend on your hosting provider.

The browser uses WebLLM with `Qwen2.5-1.5B-Instruct-q4f32_1-MLC`, loaded in a worker only after explicit activation. Build responses use a constrained JSON plan which is validated before tool execution. Plans have a 2,048-token output budget and retry once with 3,072 tokens if truncated, before any part of that plan executes. Older conversation context is bounded to leave room for generation. Architecture plans omit explanatory text and use tool receipts for confirmation. Stop cancels recovery as well as the current generation. Successful direct box plans finish with a confirmation generated from the actual modeling results, preventing repeat edits during an AI confirmation pass. The 1.5B model has three times the parameters of the previous 0.5B model; inspect its results. **Cancel download** stops loading; **Unload AI** releases the worker and leaves cached assets. No cloud inference fallback is configured.

To use a larger local model instead, open **AI settings** and select **Local server · advanced**. Desktop builds use this local-server option. Start LM Studio’s local server with a downloaded chat model, then choose **LM Studio → Find local models → Save**. The default endpoint is `http://127.0.0.1:1234/v1`; leaving Model blank uses the first available chat model.

For Ollama, start it with `OLLAMA_NO_CLOUD=1 ollama serve`, install a tool-capable model, then choose **Ollama → Find local models → Save** (endpoint `http://127.0.0.1:11434/v1`). The local-server option does not download models for you. Build mode requires tool calling; model quality and hardware determine performance.

In local-server mode, AI requests go only to a loopback server on this computer. There is no Anthropic transport, API key, or cloud fallback. Redirects and remote server URLs are rejected; cloud-tagged and embedding models are excluded. Keep the configured local server itself in local-only mode; Sight3D cannot control any custom server’s internal routing.

The development browser server proxies the standard LM Studio/Ollama ports locally, so no CORS changes are needed for `npm run dev:web`. Production browser builds connect directly: enable CORS in LM Studio or allow the app’s origin with Ollama’s `OLLAMA_ORIGINS`. Desktop builds connect directly without browser CORS restrictions. No inference request is routed through an external proxy.

Protocol references: [LM Studio tool calling](https://lmstudio.ai/docs/developer/openai-compat/tools), [Ollama compatibility](https://docs.ollama.com/api/openai-compatibility), [Ollama local-only configuration](https://docs.ollama.com/faq).

**Build** can inspect, create and modify geometry using the existing modeling API. Boxes and cubes use a validated direct shape tool, so local models do not need to write JavaScript for them. Advanced tasks still depend on the chosen model’s coding and tool-calling ability. Starter prompts fill the composer for you to review and send. Include dimensions and select geometry when you want to edit it. **Learn** answers modeling questions without executing model tools. The tool guide’s **Explain with AI** supplies the current tool as context.

**Stop** prevents subsequent actions after the current provider request or modeling operation finishes; it cannot interrupt an executing script or roll back completed work. **Undo last operation** reverses one recorded modeling operation. A request, including a single AI script, may produce several undo steps (for example, drawing a face and then extruding it). Inspect the operation details and model after partial failures before retrying. AI-generated scripts retain the original application’s execution capabilities; Build mode is not an isolated script sandbox.

## Validation

`npx tsc --noEmit`, `npm test -- --runInBand`, and production builds. The AI turn-loop tests cover tool result chaining, provider errors, read-only Learn mode, stop boundaries, truncated responses and action limits. UI smoke tests use mocked provider responses; `node scripts/sight3d-local-live.cjs` checks an actual local server. `node scripts/sight3d-browser-live.cjs` is an optional real browser-model check, downloading the model and verifying cube creation without inference HTTP POSTs. It requires a running dev site and compatible Playwright Chromium/WebGPU environment.

## Static website hosting

Run `npm run build:web` and serve **dist/web** over HTTPS on a static host. No inference backend or secret environment variables are required. Worker and model-library chunks resolve relative to the site, including a hosted subdirectory. The host must allow worker scripts, WebAssembly compilation, and connections to Hugging Face and MLC model assets if it supplies a restrictive Content Security Policy. Model downloads are made directly by each visitor’s browser.

Vercel uses the committed `vercel.json`: install with `npm ci`, build with `npm run build:web`, and publish `dist/web` using the Other framework preset. The default `npm run build` is for Electron and must not be used as the website build. GitHub CI builds and smoke-tests the static website on each push. Locally, run `npm run build:web && npm run test:web`; set `SIGHT3D_URL` to test a deployed URL instead. The legacy AWS script requires an explicit `SIGHT3D_S3_BUCKET` and is not used by Vercel.

## Buildings and city inspiration

The browser model now calls a flexible procedural architecture tool. Supported types include houses, apartments, offices, skyscrapers, warehouses, pavilions and civic buildings. Footprints include rectangles, round/oval forms, triangles, hexagons, L/U shapes and custom polygons. Twisting, tapering and custom loft profiles can vary the silhouette. Roofs include flat, gabled, hipped, dome, pyramid and spire forms; nonrectangular gables are converted to hips and reported that way.

Examples:
- “Create a circular glass office, 30m wide, 30m deep and 100m tall, twisted 60 degrees, flat roof, detail 2.”
- “Create an L-shaped apartment, 24m wide, 18m deep, 20m tall, 5 floors, flat roof.”
- “Create a small house, 12m wide, 9m deep, 7m tall with a gable roof.”
- “Generate a Paris neighborhood with 6 buildings, detail 2.”

City presets: New York, Chicago, Paris, Tokyo, Dubai, Singapore, London, Barcelona, Hong Kong, San Francisco, Venice and Sydney. They influence proportions, roof forms and materials. Blocks contain varied buildings, streets and sidewalks. These are fictional city-inspired concept models, not real street maps or accurate reconstructions of landmarks.

Individual buildings support 1–200 floors, total heights of 0.5–1,000m including roofs, and footprints up to 2,000m wide/deep. Custom polygons accept 3–32 points; lofts accept 2–12 profiles. Geometry budgets limit each building to 16,000 faces and a block to 50,000 faces / 25 buildings. Above 80 floors, window rows are simplified. This is a bounded concept generator, not unrestricted architectural CAD or a model trained on every city.

Detail 1 generates the mass and roof, detail 2 adds window panels, and detail 3 adds floor bands. “Add more detail” advances the latest individual building in this session. Creation and detail passes each have one undo step; a whole city block also has one undo step. Reopened files preserve geometry but not the procedural refinement reference. Windows are exterior surface panels, not interior rooms. The older stepped Art Deco tower tool remains available to local tool-capable models.

Run `SIGHT3D_SCENARIO=architecture node scripts/sight3d-browser-live.cjs` for a real browser-model check covering a twisted circular office, an L-shaped apartment, progressive detail, a Paris block and undo. Geometry tests cover all footprint and roof types plus custom lofts.

## Objects, arcs and surfaces

The assistant now has direct `create_object` and `apply_surface` tools. Ask for spheres, cylinders, cones, toruses, tubular arcs, tables, chairs, water volumes or a glass of water. A glass of water has a closed hollow glass shell and a separate water volume. Each object or surface application is one undo step. Dimensions are meters; Y is up. Arc angle is in degrees and thickness is the tube radius. These are editable procedural models, not an external asset library.

Try the new starter prompts, or ask “Create a purple sphere with radius 2m”, “Create a blue arc with radius 2m and angle 120 degrees”, or select faces and ask “Make the selected faces glass”. Basic color names and #RRGGBB colors are supported. The Materials palette includes clear glass, water and nine color swatches for manual painting. Glass and water use transparency and roughness; they are visual materials, not fluid simulation or physically refractive glass.

Browser inference has no paid API quota, but GPU memory, context, generation and geometry safeguards still apply. The model upgrade requires a new download; old cached assets are not reused as the larger model.

## Broad building catalog and custom concepts

The local catalog contains **683 named building subtypes in 63 categories × 10 design styles × 10 massing forms = 68,300 addressable exterior concept recipes**. It adds retrieval and procedural geometry to the existing AI; it does not retrain the model or claim 68,300 independent architectural classes. Recipes are generated on demand, so the full catalog is never stuffed into the model context.

Categories cover homes, multi-family housing, hospitality, offices, retail, food, education, healthcare, culture, performance, civic administration, emergency services, worship, sport, passenger transport, industry, agriculture and utilities. Examples include cottages, banks, castles, research laboratories, clinics, museums, railway stations, hangars, greenhouses and lighthouses. The catalog search tool returns categories, subtype IDs, typical concept dimensions and modeled features; it supports up to 20 results per page. These dimensions are design defaults, not architectural standards.

Use the **Building catalog** starter, or ask:
- “Show me types of buildings in the catalog.”
- “Create a terraced brutalist art museum, 48m wide and 20m tall.”
- “Create a traditional railway station, 70m wide.”
- “Build a minimalist dental clinic, 12m tall.”
- “Create a neighborhood of cottages.”

Style treatments: contemporary, minimalist, industrial, traditional, Mediterranean-inspired, Nordic-inspired, Art Deco-inspired, Brutalist-inspired, futuristic and vernacular-inspired. They affect facade material, roof defaults, window spacing and window/floor-band proportions. Massing forms: compact, elongated, slender, L-wing, open courtyard, circular, oval, hexagonal, tapered and terraced. Subtype features include porches, balconies, canopies, colonnades, loading bays, chimneys, spires, domes, skylights, platforms, hangar doors and shopfronts.

A recipe ID such as `art_museum/brutalist/terraced` can be passed to `create_building` as `catalogId`. A subtype ID alone uses contemporary/compact defaults; `designStyle` and `massing` override those defaults. Explicit prompt dimensions, shapes and roof requests take priority over recipe defaults. Width/depth describe the main mass; projecting facade features can extend beyond it. City blocks can use the same subtype. Creation and each detail pass remain undoable.

These are simplified editable exteriors. Subtype names and stylistic treatments do not imply authentic historic reconstruction, designed interiors, structural engineering, fluid simulation, or building-code compliance. Generic buildings, custom footprints, loft profiles and scripted geometry remain available outside the catalog.


The expanded catalog includes specialist housing and care, retail services, food production, research, specialist hospitals, religious and historic buildings, manufacturing, utilities, logistics, vehicle services, media, remote facilities and mixed-use buildings, alongside the existing sports venues. Accented names, common aliases, regular plurals and “centre” spelling are recognized.

**Coverage is explicit.** Original recipes and sports venues retain their generators. New family recipes share family-level proportions and exterior features; their receipts identify them as family concepts. They are not individually researched reconstructions. A named type outside the catalog is accepted through `buildingUse` and creates an explicitly labeled approximate exterior. The app does not claim complete coverage of every building tradition, interior, structure or piece of equipment.

For custom concepts, use `create_building` with `buildingUse` (up to 120 characters), optional `baseType`, dimensions, style and massing. Choose up to four `features` from porch, balconies, canopy, colonnade, loading_bays, chimney, spire, dome, skylights, platform, hangar_door and shopfront. An empty feature list omits automatic attachments. Invalid catalog IDs remain errors; use `buildingUse` for a new name instead of inventing an ID. Individual buildings and custom-use city blocks retain undo support.

Examples: “Create a semiconductor fabrication plant”, “Build a Buddhist temple”, “Make a hospice, 32m wide”, or “Create a lunar archival facility, 40m wide and 18m tall, with skylights and a canopy”. The final example is an inferred concept, and the completion message says so. Family dimensions are illustrative defaults; explicit dimensions still take priority.

### Quick stadium presets without an AI download

In Create mode, the **Quick stadium preset** starter fill requests you can send immediately. Explicit quick/preset stadium and arena creation requests use the existing procedural generator directly and confirm its actual result, without depending on an AI model choosing a tool. Try “Create a quick soccer stadium preset 200m wide and 140m deep” or “Create a quick basketball arena preset with an open roof”. Undo reverses the whole venue. Questions, edits, multiple objects and specialized requests still use the assistant. Ask for help mode does not take this direct creation path. Venue geometry remains a conceptual seating bowl and playing surface, not a certified competition layout.

The production browser smoke test now submits venue prompts through the real chat with AI disabled, asserts zero AI calls, checks geometry and undo, and uses no mocked model reply for these scenarios.


## Design from learned examples

Ordinary design requests now prefer `create_design`: the model chooses a known example or typical form from its pretrained knowledge, names the inspiration and defining features, and outputs a multi-part assembly. It can position and rotate boxes, ellipsoids, elliptical cylinders and cones with colors and materials. This path preserves the model’s proportions and placements instead of replacing them with catalog defaults. The entire assembly validates before creation and undoes in one step.

Try “Create a lighthouse inspired by a traditional coastal lighthouse” or “Make a tower inspired by the Eiffel Tower, using its recognizable structure”. These are memory-based approximations, not retrieval of a training image or browsing for verified references. The model weights have not changed; the 1.5B browser model’s knowledge, spatial reasoning and output budget still limit quality. Local-server models use the same tool and may produce better plans.

The browser reserves 3,072 output tokens for these plans, retrying once with 4,096 if truncated. Plans support up to 96 parts; prompts recommend 8–24 recognizable parts first. Parts form an assembly rather than a watertight boolean union. Explicit quick/catalog requests retain the procedural tools, and exact primitive requests retain their smaller schemas. Learn mode cannot execute the assembly tool.

`node scripts/verify-knowledge-live.cjs` optionally tests a real model on an already-running LM Studio loopback server, then validates and executes its generated plan and checks undo. `SIGHT3D_TEST_MODEL` selects a served model and `SIGHT3D_TEST_PROMPT` changes the example. This does not test browser WebGPU inference.

### Sourced architectural examples

Ordinary AI design requests now retrieve real building references before generation, on both the browser and local-server paths. Search accepts named buildings, teams, leagues, cities, and building categories. `search_architecture_references` browses the same sources. `create_design` accepts up to three `referenceIds` and includes their source links in its successful receipt; unknown IDs are rejected before edits.

The offline snapshot combines Wikidata building/venue facts, a GeoNames inventory of populated places above 200,000, and researched form notes for selected landmarks and residential projects. Small, explicitly invented geometry exercises help the model place stadium stands, tower tiers, and balconies coherently. User dimensions override reference dimensions. Missing local examples and missing shape information are disclosed instead of turning an arbitrary preset into a claimed replica.

See `data/architecture/README.md` for attribution and refresh instructions, and `data/architecture/coverage.json` for exact counts, incomplete queries, team/venue links, and city coverage gaps. This adds example retrieval, not model-weight training. Coverage is incomplete: a city entry is not a sourced building, residential does not mean condominium ownership, and indexed league memberships are not verified current rosters.

### Photo-first building concepts

The assistant now defaults to finding a photo for new building requests. Search a building by name and choose a view, or send a building request to select a matching view automatically. Clear the photo and turn off “Find a photo for new buildings” to use the text-reference path above. Exact primitive operations and quick presets remain available.

The static photo database contains 400,000 distinct source photo IDs/URLs across 52,536 architectural landmark labels from Google Landmarks v2. Images are loaded on demand from Wikimedia, with source links and author/license credits. It is not 400,000 locally downloaded images or a visually audited survey. The lazy landmark search index and bounded shard cache avoid loading all photo records into application memory. See `data/photos/README.md` for selection rules, licenses and refresh instructions.

Enable photo AI under the browser download/device details for actual image understanding, or use a local vision-capable model. The default smaller text model cannot inspect images. Photo AI gets a locally resized image and emits only a validated `create_design` command; it never executes arbitrary code found in an image. The result is an approximate, undoable concept. Plans for identical photo IDs and prompts are cached locally after successful execution, so repeats avoid inference; clearing browser data also clears that cache.

`node scripts/verify-photo-library.cjs` verifies counts, attribution fields, uniqueness, hashes and 1,000 search cases. `node scripts/verify-photo-web.cjs` exercises real photo loading, pixel attachment, real geometry/undo and cache reuse with stubbed inference. This browser integration check does not certify vision-model accuracy. A real vision-generation benchmark has not been completed on this machine.
