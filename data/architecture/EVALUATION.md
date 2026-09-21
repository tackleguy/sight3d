# Reference integration evaluation

Validated on 2026-09-21. This snapshot improves access to real examples; it is not model-weight training or a demonstrated solution to arbitrary building reconstruction.

## Passing checks

- TypeScript compilation (`npx tsc --noEmit`).
- 69 tests across architecture references, knowledge designs, browser AI, local AI, and objects. These cover retrieval, source attribution, real system-prompt injection, constraints, tool execution, and undo.
- Production web build (`npm run build:web`).
- Browser smoke test (`npm run test:web`): quick stadium and arena creation, catalog models, objects, undo/redo, refresh, and unsupported-GPU recovery without browser errors.

The browser smoke test does not benchmark the browser language model. Mocked transport tests establish protocol behavior, not architectural quality.

## Live model limitation

The installed `mirai-nova-llama3-localai-8b-v0.2` model was tested through the browser JSON protocol using LM Studio with the real application system prompt, retrieved sources, and an in-context stacking example:

> Create a condo inspired by Habitat 67 using the supplied sourced reference. Use 8 to 12 stacked dwelling modules with exposed terraces, all supported above ground. Include the supplied reference ID.

The final attempt failed the dwelling-module count validation, including after a corrective retry. No geometry from that rejected response was executed. This is a failed generation-quality check, not a successful Habitat 67 reconstruction. Source retrieval alone has not made this model reliable for complex architectural assemblies. The bundled browser model has not been benchmarked on this request.

See [COVERAGE.md](COVERAGE.md) for the incomplete city and team coverage and [README.md](README.md) for source licenses and refresh procedures.

## 1,000-case integration run

Run `node scripts/verify-architecture-1000.cjs` to reproduce the deterministic suite. It samples 250 team/venue requests, 200 supertalls, 200 residences, and 150 city requests, then exercises 100 varied primitive assemblies with undo/redo and rejects 100 invalid plans. This validates behavior against the imported records; it does not independently verify the source facts or run 1,000 AI generations.

The first run passed 996/1,000. Four city searches (Bahía Blanca, Monterrey, Guadalajara, Colorado Springs) escaped the city filter through sports-team aliases. Explicit city-scoped requests now retain their location restriction, and directly assigned city IDs also count as local matches. The unchanged 1,000-case suite then passed 1,000/1,000. All 73 unit tests and TypeScript compilation passed after the fix.

Full case results: [before](../../tests/reports/architecture-1000-before.json), [after](../../tests/reports/architecture-1000-after.json).

A separate live Allianz Arena request created eight parts (202 faces) and passed undo, but inspection of its [generated plan](../../tests/reports/stadium-live-plan.json) revealed a 150-metre solid sphere covering the field and incorrectly oriented, largely underground roof cylinders. **Architectural quality failed despite successful tool execution.** The request did not explicitly say “above ground,” so the current conditional ground check did not reject it. Existing validation does not establish stadium-field clearance or faithful architectural form. This run does not establish that the model can produce a usable Allianz Arena design.
