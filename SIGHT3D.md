# Sight3D quick start

Based on the source supplied as `draft-down-main.zip` (archive revision `12f7f43033b9807b019d0c8b9b7980b54467278d`). Original implementation documentation remains in README.md.

## Run

Use Node 20 or newer. Run `npm ci`, then `npm run dev:web` and open http://localhost:3001. For the desktop app, run `npm start`. Production builds: `npm run build` and `npm run build:web`.

## Model by hand

Choose **Start modeling** for a blank model in meters. Quick start explains Rectangle → Push/Pull → Orbit. Type dimensions into Measurements and press Enter. Essential tools appear first; choose **Show all tools** for advanced operations. **Model tray** opens entity information, materials, outliner and layers. **AI assistant** opens the assistant without covering the desktop canvas.

## Model with AI

On the website, choose **Enable browser AI** in the assistant. No account, API key, or local server is needed. The first use downloads approximately 300 MB of model assets from Hugging Face and MLC; the browser caches them when storage permits. Inference and prompts stay on the visitor’s device. A current WebGPU-capable browser, HTTPS (or localhost), and roughly 1–2 GB of available graphics memory are required. Unsupported devices can still model manually. Loading and generation can be slow on modest hardware. This removes inference API fees; hosting and download bandwidth depend on your hosting provider.

The browser uses WebLLM with `Qwen2.5-0.5B-Instruct-q4f32_1-MLC`, loaded in a worker only after explicit activation. Build responses use a constrained JSON plan which is validated before tool execution. Successful direct box plans finish with a confirmation generated from the actual modeling results, preventing repeat edits during an AI confirmation pass. This small model is best suited to simple shapes and short instructions; inspect its results. **Cancel download** stops loading; **Unload AI** releases the worker and leaves cached assets. No cloud inference fallback is configured.

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
