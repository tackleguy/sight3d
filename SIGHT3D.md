# Sight3D quick start

Based on the source supplied as `draft-down-main.zip` (archive revision `12f7f43033b9807b019d0c8b9b7980b54467278d`). Original implementation documentation remains in README.md.

## Run

Use Node 20 or newer. Run `npm ci`, then `npm run dev:web` and open http://localhost:3001. For the desktop app, run `npm start`. Production builds: `npm run build` and `npm run build:web`.

## Model by hand

Choose **Start modeling** for a blank model in meters. Quick start explains Rectangle → Push/Pull → Orbit. Type dimensions into Measurements and press Enter. Essential tools appear first; choose **Show all tools** for advanced operations. **Model tray** opens entity information, materials, outliner and layers. **AI assistant** opens the assistant without covering the desktop canvas.

## Model with AI

Open **AI settings** inside the assistant and add your Anthropic API key. Requests send your prompt and model context to Anthropic and use your provider account. Keys are stored in the existing local preference store (browser localStorage in the web build); use the desktop build on shared machines. No shared key is shipped.

**Build** can inspect, create and modify geometry using the existing modeling API. Starter prompts fill the composer for you to review and send. Include dimensions and select geometry when you want to edit it. **Learn** answers modeling questions without executing model tools. The tool guide’s **Explain with AI** supplies the current tool as context.

**Stop** prevents subsequent actions after the current provider request or modeling operation finishes; it cannot interrupt an executing script or roll back completed work. **Undo last operation** reverses one recorded modeling operation. A request, including a single AI script, may produce several undo steps (for example, drawing a face and then extruding it). Inspect the operation details and model after partial failures before retrying. AI-generated scripts retain the original application’s execution capabilities; Build mode is not an isolated script sandbox.

## Validation

`npx tsc --noEmit`, `npm test -- --runInBand`, and production builds. The AI turn-loop tests cover tool result chaining, provider errors, read-only Learn mode, stop boundaries, truncated responses and action limits. UI smoke tests use mocked provider responses; a real provider response requires the user's key.
