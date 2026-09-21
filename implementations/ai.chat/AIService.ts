import { SEARCH_ARCHITECTURE_TOOL, searchArchitectureReferences } from './architecture-references';
import { createKnowledgeDesign, KNOWLEDGE_DESIGN_TOOL, KNOWLEDGE_DESIGN_PROMPT } from './knowledge-design';
import { searchBuildingCatalog } from './building-catalog';
import { createObject, paintObject, surfaceOptions, OBJECT_TYPES } from './objects';
import { createBuilding, createCity, detailBuilding } from './architecture';
import { buildSkyscraper } from './skyscraper';
// @archigraph ai.chat
// AI service — exposes the DraftDown Ruby API JS façade as the AI's tool surface.
//
// Design notes
// ────────────
//  • Direct create_box plus execute_script, inspect, read_state and read_api_reference.
//  • `execute_script` auto-wraps in startOperation/commitOperation, captures console.log,
//    diffs the entity set before/after to return concrete `created` / `removed` IDs so
//    Claude can chain operations without hunting for handles.
//  • `read_state` returns compact JSON, not markdown — fewer tokens, easier to parse.
//  • `inspect` accepts an array of IDs and returns one structured record per entity.
//  • `read_api_reference` returns a focused cheat sheet, but the system prompt already
//    embeds the essentials so Claude can usually skip calling it.
//
// The AI thinks of itself as writing JavaScript that drives the same DraftDown Ruby API
// that plugins use; anything it generates is paste-able into the Ruby Console.

import type { IModelAPI } from '../api.model/ModelAPI';
import type { Vec3, Color, BoundingBox } from '../../src/core/types';

// ─── Message Types ───────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown>; result?: string }>;
}

// ─── Tool Definitions (Claude API format) ────────────────────────

export function getToolDefinitions() {
  return [
    KNOWLEDGE_DESIGN_TOOL,
    SEARCH_ARCHITECTURE_TOOL,
    {name:'search_building_catalog',description:'Search building subtypes, including sports stadiums and arenas, with 10 design styles and 10 massing forms. Use for subtype discovery or to browse types. Returns catalog IDs, dimensions and features. Search with an empty query and offset to page through all subtypes. Does not edit geometry.',input_schema:{type:'object' as const,properties:{query:{type:'string'},offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:20}}}},
    { name:'create_object', description:'Create a 3D model: sphere, cylinder, cone, torus, tubular arc, glass_of_water (hollow glass with water inside), table, chair, or water volume. Dimensions in meters, Y up. Radius controls curved shapes; height controls cylinders, cones, furniture and glass; width/depth control furniture and water. Arc angle is degrees, thickness is tube radius. Optional material and color apply to the model. One undo step.', input_schema:{type:'object' as const,properties:{type:{type:'string',enum:[...OBJECT_TYPES]},radius:{type:'number',minimum:.001,maximum:1000},height:{type:'number',minimum:.001,maximum:2000},width:{type:'number',minimum:.001,maximum:2000},depth:{type:'number',minimum:.001,maximum:2000},angle:{type:'number',minimum:1,maximum:360},thickness:{type:'number'},segments:{type:'integer',minimum:8,maximum:128},fill:{type:'number',minimum:.01,maximum:.95},material:{type:'string',enum:['solid','glass','water','metal','wood']},color:{type:'string',description:'Basic color name or #RRGGBB.'},x:{type:'number'},y:{type:'number'},z:{type:'number'}},required:['type']} },
    { name:'apply_surface',description:'Apply glass, water, solid color, metal or wood to existing faces. Omit faceIds to paint selected faces. Read state first if you need IDs. One undo step.',input_schema:{type:'object' as const,properties:{faceIds:{type:'array',items:{type:'string'}},material:{type:'string',enum:['solid','glass','water','metal','wood']},color:{type:'string',description:'Basic color name or #RRGGBB.'}}}},
    {name:'create_building',description:'Design any supported building type and shape, including houses, apartments, offices, skyscrapers, warehouses, pavilions, civic buildings, sports stadiums and arenas. Supports city-inspired architecture, custom polygon footprints and loft profiles. Explicit user dimensions and shapes take priority. Height includes the roof. Use this instead of the legacy fixed skyscraper tool.',input_schema:{type:'object' as const,properties:{
      buildingUse:{type:'string',maxLength:120,description:'Any building use, including types outside the catalog. Returns a clearly labeled concept approximation when no dedicated recipe exists.'},baseType:{type:'string',enum:['house','apartment','office','skyscraper','warehouse','pavilion','civic']},features:{type:'array',maxItems:4,items:{type:'string',enum:['porch','balconies','canopy','colonnade','loading_bays','chimney','spire','dome','skylights','platform','hangar_door','shopfront']}},
      catalogId:{type:'string',description:'Subtype ID from search_building_catalog or retrieved context; optionally subtype/designStyle/massing.'},designStyle:{type:'string',enum:['contemporary','minimalist','industrial','traditional','mediterranean','nordic','art_deco','brutalist','futuristic','vernacular']},massing:{type:'string',enum:['compact','elongated','slender','l_wing','courtyard','circular','oval','hexagonal','tapered','terraced']},
      type:{type:'string',description:'Base type (house, apartment, office, skyscraper, warehouse, pavilion, civic, stadium, arena) or a catalog subtype name.'},
      sport:{type:'string',description:'Sport name. Presets cover field, court, ice, aquatic, combat, track and other sports. Unlisted sports use a configurable multi-sport surface; dimensions describe the whole venue. Concepts are not regulation layouts.'},
      shape:{type:'string',enum:['rectangle','circle','ellipse','triangle','hexagon','l_shape','u_shape','custom']},
      roof:{type:'string',enum:['flat','gable','hip','dome','pyramid','spire','open']},style:{type:'string',enum:['glass','brick','stone','concrete','terracotta','white']},
      city:{type:'string',description:'City inspiration: new_york, chicago, paris, tokyo, dubai, singapore, london, barcelona, hong_kong, san_francisco, venice, sydney.'},
      floors:{type:'integer',minimum:1,maximum:200},height:{type:'number',minimum:.5,maximum:1000},width:{type:'number',minimum:1,maximum:2000},depth:{type:'number',minimum:1,maximum:2000},
      twist:{type:'number',minimum:-180,maximum:180},taper:{type:'number',minimum:0,maximum:.85},rotation:{type:'number'},detail:{type:'integer',minimum:1,maximum:3},x:{type:'number'},y:{type:'number'},z:{type:'number'},
      footprint:{type:'array',description:'Custom outline in meters; use shape=custom.',minItems:3,maxItems:32,items:{type:'object',properties:{x:{type:'number'},z:{type:'number'}},required:['x','z']}},
      sections:{type:'array',description:'Optional custom loft profiles ordered from at=0 to at=1; control taper, lean and twist.',minItems:2,maxItems:12,items:{type:'object',properties:{at:{type:'number'},scale:{type:'number'},rotation:{type:'number'},offsetX:{type:'number'},offsetZ:{type:'number'}},required:['at']}}
    }}},
    {name:'create_city',description:'Create a varied fictional city-inspired block with buildings, streets and sidewalks. This is not an actual map reconstruction. Use for a city, skyline, neighborhood or city block. Supported inspirations: New York, Chicago, Paris, Tokyo, Dubai, Singapore, London, Barcelona, Hong Kong, San Francisco, Venice, Sydney.',input_schema:{type:'object' as const,properties:{buildingUse:{type:'string',maxLength:120,description:'Custom building use for each building in the block.'},baseType:{type:'string',enum:['house','apartment','office','skyscraper','warehouse','pavilion','civic']},catalogId:{type:'string',description:'Optional catalog subtype or full recipe ID for all buildings in this block.'},designStyle:{type:'string'},massing:{type:'string'},city:{type:'string'},count:{type:'integer',minimum:1,maximum:25},spacing:{type:'number',minimum:8,maximum:100},seed:{type:'integer',minimum:0},detail:{type:'integer',minimum:1,maximum:3},x:{type:'number'},z:{type:'number'}}}},
    {name:'detail_building',description:'Add the next detail level to the latest individual building created with create_building. Levels add windows, then floor bands. Does not rebuild the building.',input_schema:{type:'object' as const,properties:{}}},
    {
      name: 'create_skyscraper',
      description: 'Build a detailed skyscraper with podium, setbacks, tapered crown and facade. Use only for explicitly requested stepped Art Deco towers; use create_building for other architecture. Defaults: 48 floors, 30m wide, 24m deep, glass, 3 setbacks, detail 2. All dimensions are meters.',
      input_schema: { type: 'object' as const, properties: {
        floors: { type: 'integer', minimum: 8, maximum: 100 }, width: { type: 'number', minimum: 12, maximum: 100 }, depth: { type: 'number', minimum: 12, maximum: 100 },
        floorHeight: { type: 'number', minimum: 2.5, maximum: 6 }, setbacks: { type: 'integer', minimum: 0, maximum: 5 },
        detail: { type: 'integer', minimum: 1, maximum: 3, description: '1 massing; 2 windows and floor bands; 3 fins, terraces, lobby, plaza and rooftop details.' },
        style: { type: 'string', enum: ['glass', 'art_deco'] }, x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' },
      } },
    },
    { name: 'detail_skyscraper', description: 'Add the next detail level to the most recently created skyscraper in this session. Use when asked to add more detail, windows, or facade details to that tower. Preserves existing geometry. One undo step.', input_schema: { type: 'object' as const, properties: {} } },
    {
      name: 'create_box',
      description: 'Create a solid box or cube with exact dimensions in meters. Use this instead of a script for boxes. Origin is the bottom-front-left corner; Y is up.',
      input_schema: {
        type: 'object' as const,
        properties: {
          material: { type: 'string', enum: ['solid', 'glass', 'water', 'metal', 'wood'] },
          color: { type: 'string', description: 'Basic color name or #RRGGBB.' },
          width: { type: 'number', description: 'Width along X in meters, positive.' },
          depth: { type: 'number', description: 'Depth along Z in meters, positive.' },
          height: { type: 'number', description: 'Height along Y in meters, positive.' },
          x: { type: 'number', description: 'Origin X in meters, default 0.' },
          y: { type: 'number', description: 'Origin Y in meters, default 0.' },
          z: { type: 'number', description: 'Origin Z in meters, default 0.' },
        },
        required: ['width', 'depth', 'height'],
      },
    },
    {
      name: 'execute_script',
      description:
        'Run JavaScript against the DraftDown Ruby API JS façade — the SAME surface that plugins use.\n\n' +
        'Globals already in scope (do NOT redeclare them):\n' +
        '  DraftDown, Geom, UI, Length, console, model, m   (`m` and `model` both alias `DraftDown.activeModel`).\n\n' +
        'The runner auto-wraps your script in `model.startOperation(operationName)` / `commitOperation()` so the user gets ONE undo step. Do NOT call those yourself.\n\n' +
        'The script body is the body of an async function — `await`, `let`, `const`, multiple statements, and a final `return` are valid.\n\n' +
        'On success the result includes:\n' +
        '  • `created` — IDs of new {faces, edges, vertices, groups} from this operation.\n' +
        '  • `removed` — IDs that vanished.\n' +
        '  • `result`  — your `return` value (JSON-stringified).\n' +
        '  • `log`     — captured console output.\n' +
        'On failure: `error` (with stack trace excerpt) and partial `created` so you can debug.\n\n' +
        'Quick patterns:\n' +
        '  // Make a 1x1x1 box\n' +
        '  const f = model.entities.addFace(\n' +
        '    new Geom.Point3d(0,0,0), new Geom.Point3d(1,0,0),\n' +
        '    new Geom.Point3d(1,0,1), new Geom.Point3d(0,0,1));\n' +
        '  f.pushpull(1);\n' +
        '  return { faceId: f.id, area: f.area };\n\n' +
        '  // Use the high-level ModelAPI for compound shapes\n' +
        '  const r = model.api_.createBox({x:0,y:0,z:0}, 2, 1, 3);\n' +
        '  return r.faceIds;\n\n' +
        '  // Boolean ops are async — await them.\n' +
        '  await model.api_.booleanSubtract(idsA, idsB);',
      input_schema: {
        type: 'object' as const,
        properties: {
          script: { type: 'string' as const, description: 'JS to run.' },
          operationName: { type: 'string' as const, description: 'Short undo-step label e.g. "Make Wall", "Cut Window". Required.' },
        },
        required: ['script', 'operationName'],
      },
    },
    {
      name: 'inspect',
      description:
        'Get structured info for one or more entity IDs (faces, edges, vertices, groups, component instances). ' +
        'Cheaper than scripting when you just need to look at what\'s there. Returns an array — one record per ID; ' +
        'unknown IDs return `{ id, error: "not found" }`.',
      input_schema: {
        type: 'object' as const,
        properties: {
          ids: { type: 'array' as const, items: { type: 'string' as const }, description: 'Entity IDs to inspect.' },
        },
        required: ['ids'],
      },
    },
    {
      name: 'read_state',
      description:
        'Compact JSON snapshot of the model — current selection (faces/edges/vertices with key properties), ' +
        'totals, bounds, materials, layers, and IDs of recently-created entities. Call this BEFORE scripting if you need to ' +
        'know what the user has selected or what just got built.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'read_api_reference',
      description:
        'Return the full DraftDown Ruby API JS façade reference. Most everyday operations are already covered ' +
        'by the cheat sheet in the system prompt; only call this when you\'re unsure whether a method exists.',
      input_schema: { type: 'object' as const, properties: {} },
    },
  ];
}

// ─── Selection Context (kept for AIChatPanel compat) ─────────────

export interface SelectionContext {
  selectedFaces: Array<{ id: string; area: number; normal: Vec3; vertexCount: number; vertices: Vec3[] }>;
  selectedEdges: string[];
  selectedVertices: string[];
  totalFaces: number;
  totalEdges: number;
  modelBounds: BoundingBox | null;
  materials: Array<{ id: string; name: string; color: Color }>;
}

export function buildSelectionContext(api: IModelAPI): SelectionContext {
  const selected = api.getSelectedEntities();
  const selectedFaces = selected.faces.map(id => {
    const info = api.getFaceInfo(id);
    return info || { id, area: 0, normal: { x: 0, y: 1, z: 0 }, vertexCount: 0, vertices: [] };
  });

  let modelBounds: BoundingBox | null = null;
  try {
    if (api.getAllFaces().length > 0) modelBounds = api.getBoundingBox();
  } catch (e) { console.warn('[AIService.buildSelectionContext] bounds query failed (likely empty model):', e); }

  return {
    selectedFaces,
    selectedEdges: selected.edges,
    selectedVertices: selected.vertices,
    totalFaces: api.getAllFaces().length,
    totalEdges: api.getAllEdges().length,
    modelBounds,
    materials: api.listMaterials(),
  };
}

/** Compact JSON form of the model state — what `read_state` returns to Claude. */
function buildStateSnapshot(api: IModelAPI): unknown {
  const sel = buildSelectionContext(api);
  return {
    selection: {
      counts: {
        faces: sel.selectedFaces.length,
        edges: sel.selectedEdges.length,
        vertices: sel.selectedVertices.length,
      },
      faces: sel.selectedFaces.slice(0, 50).map(f => ({
        id: f.id,
        area: round(f.area, 4),
        normal: roundVec(f.normal, 3),
        vertexCount: f.vertexCount,
        firstVertex: f.vertices[0] ? roundVec(f.vertices[0], 3) : null,
      })),
      edges: sel.selectedEdges.slice(0, 50),
      vertices: sel.selectedVertices.slice(0, 50),
    },
    model: {
      totalFaces: sel.totalFaces,
      totalEdges: sel.totalEdges,
      bounds: sel.modelBounds ? {
        min: roundVec(sel.modelBounds.min, 3),
        max: roundVec(sel.modelBounds.max, 3),
        size: {
          x: round(sel.modelBounds.max.x - sel.modelBounds.min.x, 3),
          y: round(sel.modelBounds.max.y - sel.modelBounds.min.y, 3),
          z: round(sel.modelBounds.max.z - sel.modelBounds.min.z, 3),
        },
      } : null,
      materials: sel.materials.slice(0, 30).map(m => ({ id: m.id, name: m.name, color: m.color })),
    },
    recent: lastCreated, // populated by execute_script — see runScript
  };
}

/** Markdown form of the selection — preserved for AIChatPanel.contextToMessage. */
export function contextToMessage(ctx: SelectionContext): string {
  const lines: string[] = ['## Current Selection'];
  if (ctx.selectedFaces.length === 0 && ctx.selectedEdges.length === 0 && ctx.selectedVertices.length === 0) {
    lines.push('Nothing is selected.');
  } else {
    if (ctx.selectedFaces.length > 0) {
      lines.push(`**${ctx.selectedFaces.length} face(s) selected:**`);
      for (const f of ctx.selectedFaces.slice(0, 20)) {
        const n = f.normal;
        lines.push(`- \`${f.id}\`: area=${f.area.toFixed(3)}m², normal=(${n.x.toFixed(2)}, ${n.y.toFixed(2)}, ${n.z.toFixed(2)}), ${f.vertexCount} vertices`);
      }
      if (ctx.selectedFaces.length > 20) lines.push(`  ... and ${ctx.selectedFaces.length - 20} more faces`);
    }
    if (ctx.selectedEdges.length > 0) {
      lines.push(`**${ctx.selectedEdges.length} edge(s) selected:** ${ctx.selectedEdges.slice(0, 10).map(id => `\`${id}\``).join(', ')}${ctx.selectedEdges.length > 10 ? ' ...' : ''}`);
    }
    if (ctx.selectedVertices.length > 0) {
      lines.push(`**${ctx.selectedVertices.length} vertex/vertices selected:** ${ctx.selectedVertices.slice(0, 10).map(id => `\`${id}\``).join(', ')}${ctx.selectedVertices.length > 10 ? ' ...' : ''}`);
    }
  }
  lines.push('');
  lines.push('## Model Overview');
  lines.push(`Total: ${ctx.totalFaces} faces, ${ctx.totalEdges} edges`);
  if (ctx.modelBounds) {
    const b = ctx.modelBounds;
    lines.push(`Bounds: (${b.min.x.toFixed(2)}, ${b.min.y.toFixed(2)}, ${b.min.z.toFixed(2)}) to (${b.max.x.toFixed(2)}, ${b.max.y.toFixed(2)}, ${b.max.z.toFixed(2)})`);
  }
  if (ctx.materials.length > 0) {
    lines.push('');
    lines.push(`## Materials (${ctx.materials.length})`);
    for (const m of ctx.materials.slice(0, 10)) {
      lines.push(`- \`${m.id}\`: "${m.name}"`);
    }
  }
  return lines.join('\n');
}

// ─── System Prompt ───────────────────────────────────────────────

export function buildLocalSystemPrompt(): string {
  return `${KNOWLEDGE_DESIGN_PROMPT}\nYou are Sight3D's local 3D modeling assistant. Use tools to change the model; text alone cannot create geometry.
For real named buildings, team stadiums, and city examples, prefer search_architecture_references and create_design using sourced features. A catalog recipe is only for an explicit quick/preset request. Do not reduce a named example to a generic catalog type.
The local building catalog offers building and sports venue subtypes, each with 10 design styles and 10 massing forms. Use stadium or arena for any sport, with sport and venue dimensions for custom sports. Stadiums default to open roofs; roof=open also allows arena cutaways. Sports models have seating bowls and conceptual surface markings, not certified competition layouts. Sports bowls use rectangular envelopes; custom lofts, twist and footprint shapes apply to other buildings. Use search_building_catalog to discover subtypes and obtain IDs; use create_building with catalogId, designStyle and massing to build them. Preserve catalog defaults unless the user requests overrides. For unfamiliar building uses, pass buildingUse and optionally baseType to create_building. You can combine up to four features. Report the returned approximation honestly; do not imply specialized interiors, historic accuracy or structural systems exist. Never reject a building merely because its name is absent from the catalog.
For a quick procedural architectural preset use create_building: choose building type, footprint shape, roof, height, twist, taper and city inspiration from the user's request. Never turn every building into the same skyscraper. Houses can have gabled roofs; pavilions can be domed; towers can be round, elliptical, twisted or tapered; custom polygon footprints and loft sections are supported. For neighborhoods, skylines, city blocks or multiple city-inspired buildings use create_city. These are fictional city-inspired designs, not actual map data. For more detail on your latest building use detail_building. The legacy create_skyscraper tool is only for explicitly requested tiered Art Deco towers.
For objects, curved shapes, furniture and a glass of water use create_object. Use apply_surface for colors, glass and water on selected or specified faces. For a box or cube, ALWAYS call create_box with numeric width, depth and height in meters. Default origin is 0,0,0. Do not use execute_script for boxes.
Use read_state or inspect to understand existing or selected geometry. Never guess entity IDs. Ask a short question when the requested change is ambiguous. Preserve unrelated geometry.
For complex geometry, call read_api_reference before execute_script. That tool runs JavaScript with m=model=DraftDown.activeModel, Geom and UI already available. Use m.api_ helpers. Coordinates are meters; Y is up. Do not redeclare m/model or wrap scripts in a function. Use operationName to label edits.
After a successful tool result, briefly describe what actually changed and STOP. Do not repeat successful edits. If a result failed or created no geometry, do not claim success. Explain the problem or retry once with corrected inputs. Each modeling operation can be undone; a script may create several undo steps.`;
}

export function buildSystemPrompt(): string {
  return `You are an expert 3D architect inside DraftDown. You drive the model by calling
\`execute_script\` — JavaScript that uses the DraftDown Ruby API JS façade (same API
plugins use). The runner auto-wraps every call in one undo step.

═══ HOW TO WORK ═══

1. If the user references "this", "the selected face", or anything ambiguous: call
   \`read_state\` first. Don't guess IDs.
2. Plan the model in your head, then issue ONE \`execute_script\` per logical chunk
   (one chunk = one user-visible undo step). Use clear \`operationName\`s.
3. Use entity IDs from one script's \`created\` list as inputs to the next.
4. Prefer the high-level ModelAPI (\`m.api_.*\`) for compound shapes — it's faster
   to type, harder to misuse, and the geometry is correct by construction.
5. Boolean ops are async — \`await m.api_.booleanSubtract(...)\` etc.
6. NEVER call \`startOperation\`/\`commitOperation\` yourself. The runner does it.
7. Return a small summary from your script (counts, key IDs) so you have handles for
   the next call. Don't return huge arrays.
8. After non-trivial geometry, call \`m.activeView.zoomExtents()\` if the user
   probably wants to see what you built.

═══ FIXING ERRORS ═══

When \`execute_script\` returns \`{ ok: false, error, hint, ... }\`:
  • The transaction was aborted — the model is unchanged, so it's safe to retry.
  • READ THE \`hint\` field. It usually tells you exactly what to change.
  • Fix the script and call \`execute_script\` again with the SAME \`operationName\`.
  • If you don't understand the error, call \`read_api_reference\` for the full
    method list, or \`read_state\` to verify the model state. Don't guess.
  • Never apologise to the user without first attempting at least one fix.

═══ COORDINATE SYSTEM ═══
Y is UP. X right. Z forward. Units = meters. Origin (0,0,0) on the ground.

**CRITICAL — primitive origins are CORNERS, not centers:**
  • \`m.api_.createBox(origin, w, d, h)\` — origin = **bottom-front-LEFT** corner; box extends to (origin.x + w, origin.y + h, origin.z + d). To center a box at point P with dims w×d×h, pass \`{x: P.x - w/2, y: P.y, z: P.z - d/2}\`.
  • \`m.api_.createCylinder(center, r, h)\` — center IS the center of the bottom face.
  • \`m.api_.createSphere(center, r)\` — center IS the sphere's center.
  • \`m.api_.createPlane(origin, w, d)\` — origin = the CENTER of the plane (different!).

**CRITICAL — entity lookup:**
  • \`m.entities.findEntityById\` does NOT exist. Use \`m.entities.byId(id)\` — returns the wrapper.
  • \`m.findEntityById(id)\` (on Model, not Entities) also works.
  • To set a face's material, you need the WRAPPER: \`m.entities.byId(faceId).material = mat\`.
    Or use the shortcut: \`m.api_.setFaceMaterial([faceId, ...], materialId)\`.

**CRITICAL — materials:**
  • Never hard-code material UUIDs — always create one or look up by name:
        const mat = m.materials.add('Wood', '#cc8844');   // returns Material with .id
        face.material = mat;                               // or face.material = mat.id
    or:
        m.api_.setFaceColor([faceId1, faceId2], 0.8, 0.55, 0.27);  // r,g,b in 0..1
  • To list existing materials:  \`m.api_.listMaterials()\`  →  \`[{id, name, color}, ...]\`

═══ ARCHITECTURAL DEFAULTS ═══
Walls: 0.15m interior / 0.25m exterior thick · floor-to-floor 2.7–3.0m
Doors: 0.9 × 2.1m exterior, 0.8 × 2.0m interior
Windows: 1.2 × 1.5m, sill 0.9m
Stairs: rise 0.18m, tread 0.28m, width 0.9–1.2m
Roof pitch: 30–45°

═══ ESSENTIALS CHEAT SHEET ═══

\`\`\`js
// ── Model
const m = DraftDown.activeModel;
m.entities, m.selection, m.materials, m.layers, m.bounds
m.activeView.zoomExtents()

// ── Geometry primitives (high-level — preferred)
m.api_.createBox(origin, w, d, h)             // → { faceIds, edgeIds, vertexIds }
m.api_.createCylinder(center, r, h, segs?)
m.api_.createSphere(center, r, rings?, segs?)
m.api_.createPlane(origin, w, d, normal?)
m.api_.createPolygon(center, r, sides, normal?)
m.api_.createWall(start, end, h, thickness)
m.api_.cutOpening(faceId, w, h, ox?, oy?)
m.api_.createRoof(faceId, pitchDeg, overhang?)
m.api_.createStairs(start, dir, rise, tread, width, steps)
m.api_.createArch(center, r, h, thickness, segs?)
m.api_.arrayLinear(ids, dir, count, spacing)
m.api_.arrayRadial(ids, center, axis, count)
m.api_.mirrorEntities(ids, planePoint, planeNormal)
m.api_.chamferEdge(edgeId, dist)
m.api_.filletEdge(edgeId, r, segs?)
m.api_.offsetFace(faceId, dist) / .insetFace(faceId, dist)
m.api_.subdivideFaces([faceIds], 'midpoint'|'catmull-clark', iterations?)
m.api_.triangulateFaces([faceIds])
m.api_.sweep(profileFaceId, [pathEdgeIds], alignToPath?)
await m.api_.booleanUnion([idsA], [idsB])
await m.api_.booleanSubtract([idsA], [idsB])
await m.api_.booleanIntersect([idsA], [idsB])

// ── Low-level entity API (when you need precision)
m.entities.addFace(p1, p2, p3, ...)            // → Face
m.entities.addLine(p1, p2)                     // → Edge
m.entities.addEdges(...points)                 // → [Edge]
m.entities.addCircle(center, normal, r, segs?) // → [Edge]
m.entities.addArc(center, xaxis, normal, r, startAng, endAng, segs?)
m.entities.addNgon(center, normal, r, sides)
m.entities.addGroup(...entities)
m.entities.eraseEntities([entities])
m.entities.transformEntities(transform, [entities])

// ── Face / Edge / Vertex
face.area, face.normal, face.vertices, face.edges, face.id
face.material = mat | id   // also face.backMaterial
face.pushpull(distance)    // extrude
face.reverseInPlace()
face.bounds                // → Geom.BoundingBox: .center, .width, .height, .depth, .diagonal, .min, .max
edge.length, edge.start, edge.end, edge.faces, edge.id
edge.bounds                // also a BoundingBox
vertex.position            // returns a copy
vertex.position = new Geom.Point3d(...)  // moves it

// ── Finding faces among a set returned by createBox / createWall / etc.
// createBox returns { faceIds, edgeIds, vertexIds } — IDs are STRINGS, not wrappers.
// To pick a face by direction, wrap the ID then check normal/center:
//   const wrap = m.entities.byId(faceId);              // Face wrapper or null
//   const c = wrap.bounds.center; const n = wrap.normal;
//   if (Math.abs(n.z) > 0.9) { ... }                   // face is +Z- or -Z-facing

// ── Selection
m.selection.add(...entities) / .remove(...) / .clear()
m.selection.toArray() / .first() / .faces() / .edges() / .vertices()

// ── Materials
const mat = m.materials.add('Wood', '#cc8844');
face.material = mat;
m.api_.setFaceColor(faceIds, r, g, b)          // r/g/b in 0..1; returns matId
m.api_.createMaterial(name, {r,g,b}, { opacity?, roughness?, metalness? })

// ── Layers
const layer = m.layers.add('Walls');
m.layers.at('Walls').visible = true;

// ── Geom
new Geom.Point3d(x, y, z)
new Geom.Vector3d(x, y, z)
v.length, v.normalize(), v.cross(o), v.dot(o)
Geom.Transformation.translation(point)
Geom.Transformation.rotation(point, axis, angleRadians)
Geom.Transformation.scaling(sx, sy?, sz?)
\`\`\`

═══ COMMON GOTCHAS ═══
• \`m.api_.createBox\` returns { faceIds, edgeIds, vertexIds } — use these in follow-ups.
• \`face.pushpull(d)\` returns void; the new geometry's IDs come back via the \`created\`
  field of execute_script's response.
• Boolean ops MUST be \`await\`ed — they're async.
• Pass material \`r,g,b\` as 0..1, not 0..255. Use Geom.Point3d for points, not raw {x,y,z}.
• If a script throws, the operation is aborted (no partial geometry). Inspect the
  \`error\` field, fix the script, retry.
• To group geometry into one undo-selectable unit, use \`m.entities.addGroup(...entities)\`
  or \`m.api_.createGroup(name, faceIds)\`.

═══ WORKED EXAMPLE — TABLE WITH WOOD MATERIAL ═══
A complete furniture script that handles all the gotchas above:

\`\`\`js
// Table dimensions
const W = 1.8, D = 0.9, H = 0.75;
const topThickness = 0.05;
const legSize = 0.06;
const legHeight = H - topThickness;

// 1) Create the wood material FIRST (don't hard-code IDs).
const woodMatId = m.api_.createMaterial('Wood', { r: 0.55, g: 0.32, b: 0.13 },
                                        { roughness: 0.7, metalness: 0 });

// 2) Top — center it at the world origin (so X spans -W/2..+W/2, Z spans -D/2..+D/2)
const top = m.api_.createBox(
  { x: -W/2, y: legHeight, z: -D/2 },   // origin = bottom-front-LEFT corner
  W, D, topThickness,
);

// 3) Legs at the four corners. Position the leg's origin so its OUTER corner aligns
//    with the table top's outer corner (inset = 0). Leg is legSize × legSize × legHeight.
const legCorners = [
  { x: -W/2,           z: -D/2 },           // back-left
  { x: +W/2 - legSize, z: -D/2 },           // back-right
  { x: -W/2,           z: +D/2 - legSize }, // front-left
  { x: +W/2 - legSize, z: +D/2 - legSize }, // front-right
];
const legFaceIds = [];
for (const c of legCorners) {
  const leg = m.api_.createBox({ x: c.x, y: 0, z: c.z }, legSize, legSize, legHeight);
  legFaceIds.push(...leg.faceIds);
}

// 4) Apply the material to ALL faces — use the api_ shortcut, not face wrappers.
m.api_.setFaceMaterial([...top.faceIds, ...legFaceIds], woodMatId);

// 5) Wrap into one selectable Group (optional but tidy).
m.api_.createGroup('Table', [...top.faceIds, ...legFaceIds]);

m.activeView.zoomExtents();
return { topFaceCount: top.faceIds.length, legCount: 4, material: 'Wood' };
\`\`\`
`;
}

// ─── Tool executor ───────────────────────────────────────────────

interface DraftDownGlobal { DraftDown: any; Geom: any; UI: any; Length: any }
function getGlobals(): DraftDownGlobal | null {
  const w: any = (typeof window !== 'undefined') ? window : globalThis;
  if (!w.DraftDown) return null;
  return { DraftDown: w.DraftDown, Geom: w.Geom, UI: w.UI, Length: w.Length };
}

/** Tracking what the most recent execute_script created/removed. Surfaced via read_state. */
let lastCreated: { faces: string[]; edges: string[]; vertices: string[]; groups: string[]; ts: number } = {
  faces: [], edges: [], vertices: [], groups: [], ts: 0,
};

// ─── Debug logging ──────────────────────────────────────────────
//
// Toggle:  window.__AI_DEBUG__ = false  to silence.
// Inspect: window.__AI_LOG__              ← in-memory ring buffer of every call.
//
// Every tool call (input + result) is also written to `localStorage` under
// `draftdown:ai-log:<timestamp>` for forensic debugging across reloads — last 100 entries.

interface AILogEntry {
  ts: number;
  call: number;
  tool: string;
  durationMs: number;
  input: unknown;
  result: unknown;
  ok: boolean;
}

const AI_LOG_RING_MAX = 200;
let aiCallCount = 0;
const aiLogRing: AILogEntry[] = [];

function aiDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).__AI_DEBUG__ !== false; // default ON
}

function pushLog(entry: AILogEntry): void {
  aiLogRing.push(entry);
  if (aiLogRing.length > AI_LOG_RING_MAX) aiLogRing.shift();
  if (typeof window !== 'undefined') (window as any).__AI_LOG__ = aiLogRing;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`draftdown:ai-log:${entry.ts}-${entry.call}`,
        JSON.stringify({ ...entry, input: truncForLog(entry.input), result: truncForLog(entry.result) }));
      // Keep at most 100 persisted entries.
      const keys = Object.keys(localStorage).filter(k => k.startsWith('draftdown:ai-log:')).sort();
      while (keys.length > 100) {
        const oldest = keys.shift()!;
        try { localStorage.removeItem(oldest); } catch (e) { console.warn(`[AIService.pushLog] removeItem ${oldest} failed:`, e); }
      }
    } catch (e) { console.warn('[AIService.pushLog] localStorage write failed (probably quota):', e); }
  }
}

function truncForLog(v: unknown, max = 4000): unknown {
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (typeof s !== 'string') return v;
    return s.length > max ? s.slice(0, max) + ` …(+${s.length - max} chars)` : s;
  } catch { return String(v); }
}

/** Emit a labeled console.group with the call's input + result payload. */
function logCall(entry: AILogEntry): void {
  if (!aiDebugEnabled() || typeof console === 'undefined') return;
  const colour = entry.ok ? '#4ade80' : '#f87171';
  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `%c[AI #${entry.call}] %c${entry.tool}%c · ${entry.durationMs.toFixed(0)}ms · ${entry.ok ? 'ok' : 'FAILED'}`,
    'color:#888', `color:${colour};font-weight:bold`, 'color:#888',
  );
  // eslint-disable-next-line no-console
  console.log('input :', entry.input);
  // eslint-disable-next-line no-console
  console.log('result:', entry.result);
  // eslint-disable-next-line no-console
  console.groupEnd();
}

/** Public helper plugins/console can call — `dumpAILog()` to print everything. */
if (typeof window !== 'undefined') {
  (window as any).dumpAILog = () => {
    // eslint-disable-next-line no-console
    console.table(aiLogRing.map(e => ({
      call: e.call, tool: e.tool, ok: e.ok, ms: Math.round(e.durationMs),
      ts: new Date(e.ts).toLocaleTimeString(),
    })));
    return aiLogRing;
  };
  (window as any).clearAILog = () => {
    aiLogRing.length = 0; aiCallCount = 0;
    if (typeof localStorage !== 'undefined') {
      for (const k of Object.keys(localStorage).filter(k => k.startsWith('draftdown:ai-log:'))) {
        try { localStorage.removeItem(k); } catch (e) { console.warn(`[AIService.clearAILog] removeItem ${k} failed:`, e); }
      }
    }
    // eslint-disable-next-line no-console
    console.log('[AI] log cleared');
  };
}

export async function executeTool(api: IModelAPI, name: string, input: Record<string, unknown>): Promise<string> {
  const callId = ++aiCallCount;
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let resultStr = '';
  let ok = true;
  try {
    switch (name) {
      case 'search_building_catalog': resultStr = JSON.stringify(searchBuildingCatalog(input)); break;
      case 'search_architecture_references': resultStr = JSON.stringify(searchArchitectureReferences(String(input.query||''),Number(input.limit)||5,Number(input.offset)||0)); break;
      case 'create_design': resultStr = JSON.stringify(createKnowledgeDesign(api,input)); break;
      case 'create_object': resultStr = JSON.stringify(createObject(api,input)); break;
      case 'apply_surface': resultStr = JSON.stringify(paintObject(api,input)); break;
      case 'create_building': resultStr = JSON.stringify(createBuilding(api,input)); break;
      case 'create_city': resultStr = JSON.stringify(createCity(api,input)); break;
      case 'detail_building': resultStr = JSON.stringify(detailBuilding(api)); break;
      case 'create_skyscraper': resultStr = JSON.stringify(buildSkyscraper(api, input)); break;
      case 'detail_skyscraper': resultStr = JSON.stringify(buildSkyscraper(api, input, true)); break;
      case 'create_box': {
        const { width, depth, height } = input;
        const x = input.x ?? 0, y = input.y ?? 0, z = input.z ?? 0;
        if (![width, depth, height].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0) ||
            ![x, y, z].every(v => typeof v === 'number' && Number.isFinite(v))) {
          throw new Error('Box dimensions must be positive finite numbers in meters; origin coordinates must be finite numbers.');
        }
        const surface = input.material !== undefined || input.color !== undefined ? surfaceOptions(input) : null;
        let shape!: ReturnType<IModelAPI['createBox']>;
        const build = () => {
          shape = api.createBox({ x: x as number, y: y as number, z: z as number }, width as number, depth as number, height as number);
          if (surface) api.setFaceMaterial(shape.faceIds, api.createMaterial(surface.name, surface.color, surface));
        };
        if (surface) api.batch('Create colored box', build); else build();
        resultStr = JSON.stringify({ ok: true, operationName: 'Create Box', created: { faces: shape.faceIds, edges: shape.edgeIds, vertices: shape.vertexIds } });
        break;
      }
      case 'execute_script':       resultStr = await runScript(input.script as string, (input.operationName as string) ?? 'AI Script', callId); break;
      case 'inspect':              resultStr = JSON.stringify(inspect(api, (input.ids as string[]) ?? [])); break;
      case 'read_state':           resultStr = JSON.stringify(buildStateSnapshot(api)); break;
      case 'read_api_reference':   resultStr = apiReferenceMarkdown(); break;
      default:                     resultStr = JSON.stringify({ error: `Unknown tool: ${name}` }); ok = false;
    }
  } catch (err: any) {
    ok = false;
    resultStr = JSON.stringify({ ok: false, error: err?.message ?? String(err) });
  }
  const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  // Try to parse the result so the log is structured rather than a giant string.
  let parsedResult: unknown = resultStr;
  try { parsedResult = JSON.parse(resultStr); }
  catch (e) { console.warn(`[AIService.executeTool] result wasn't valid JSON for tool "${name}", keeping raw string:`, e); }
  if (parsedResult && typeof parsedResult === 'object' && (parsedResult as any).ok === false) ok = false;

  const entry: AILogEntry = {
    ts: Date.now(), call: callId, tool: name, durationMs: t1 - t0,
    input, result: parsedResult, ok,
  };
  pushLog(entry);
  logCall(entry);
  return resultStr;
}

async function runScript(script: string, operationName: string, callId = 0): Promise<string> {
  const globals = getGlobals();
  if (!globals) return JSON.stringify({ ok: false, error: 'DraftDown global not installed' });

  const { DraftDown, Geom, UI, Length } = globals;
  const model = DraftDown.activeModel;

  // ── Detailed pre-run log: print the actual script Claude wrote.
  if (aiDebugEnabled() && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.groupCollapsed(`%c[AI #${callId}] execute_script · "${operationName}"`,
      'color:#fbbf24;font-weight:bold');
    // eslint-disable-next-line no-console
    console.log('script:\n' + script);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  // Capture console output.
  const log: Array<{ level: string; msg: string }> = [];
  const fakeConsole = {
    log:   (...args: unknown[]) => { log.push({ level: 'log',   msg: args.map(formatArg).join(' ') });
                                     if (aiDebugEnabled() && typeof console !== 'undefined') console.log(`%c[AI #${callId} log]`, 'color:#888', ...args); },
    info:  (...args: unknown[]) => { log.push({ level: 'info',  msg: args.map(formatArg).join(' ') });
                                     if (aiDebugEnabled() && typeof console !== 'undefined') console.info(`%c[AI #${callId} info]`, 'color:#888', ...args); },
    warn:  (...args: unknown[]) => { log.push({ level: 'warn',  msg: args.map(formatArg).join(' ') });
                                     if (aiDebugEnabled() && typeof console !== 'undefined') console.warn(`%c[AI #${callId} warn]`, 'color:#fb923c', ...args); },
    error: (...args: unknown[]) => { log.push({ level: 'error', msg: args.map(formatArg).join(' ') });
                                     if (aiDebugEnabled() && typeof console !== 'undefined') console.error(`%c[AI #${callId} error]`, 'color:#f87171', ...args); },
  };

  // Snapshot mesh + group entity IDs BEFORE so we can diff afterward.
  const before = snapshotEntityIds(model);
  const tStart = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let fn: (...a: unknown[]) => Promise<unknown>;
  try {
    // Inject `m` as a shorthand alias for `model` since the cheat sheet uses both forms.
    fn = new AsyncFunction(
      'DraftDown', 'Geom', 'UI', 'Length', 'console', 'model', 'm',
      `"use strict";\n${script}`,
    );
  } catch (parseErr: any) {
    if (aiDebugEnabled() && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error(`[AI #${callId}] SyntaxError parsing script:`, parseErr?.message ?? parseErr);
    }
    return JSON.stringify({
      ok: false,
      error: `SyntaxError: ${parseErr?.message ?? parseErr}`,
      hint: 'Check matching braces / parentheses; the script body is the body of an async function (no surrounding `function`/`async` wrapper).',
      log,
    });
  }

  model.startOperation(operationName, true);
  let result: unknown;
  let threw: any = null;
  try {
    result = await fn(DraftDown, Geom, UI, Length, fakeConsole, model, model /* m */);
    model.commitOperation();
  } catch (e: any) {
    try { model.abortOperation(); } catch (abortErr) { console.warn('[AIService.runScript] model.abortOperation failed:', abortErr); }
    threw = e;
  }

  const tEnd = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const after = snapshotEntityIds(model);
  const diff = diffEntityIds(before, after);

  if (threw) {
    const msg = threw?.message ?? String(threw);
    if (aiDebugEnabled() && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error(`[AI #${callId}] script "${operationName}" threw after ${(tEnd - tStart).toFixed(0)}ms:`, msg);
      // eslint-disable-next-line no-console
      if (threw?.stack) console.error(threw.stack);
    }
    return JSON.stringify({
      ok: false,
      operationName,
      error: msg,
      hint: errorHint(msg),
      stack: typeof threw?.stack === 'string' ? truncate(threw.stack, 800) : undefined,
      log,
      created: { faces: [], edges: [], vertices: [], groups: [] },
      removed: { faces: [], edges: [], vertices: [], groups: [] },
    });
  }

  if (aiDebugEnabled() && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log(
      `%c[AI #${callId}] "${operationName}" ok in ${(tEnd - tStart).toFixed(0)}ms ` +
      `· created: F${diff.created.faces.length} E${diff.created.edges.length} V${diff.created.vertices.length} G${diff.created.groups.length} ` +
      `· removed: F${diff.removed.faces.length} E${diff.removed.edges.length} V${diff.removed.vertices.length} G${diff.removed.groups.length}`,
      'color:#4ade80',
    );
  }

  lastCreated = { ...diff.created, ts: Date.now() };

  return JSON.stringify({
    ok: true,
    operationName,
    created: diff.created,
    removed: diff.removed,
    result: result === undefined ? null : safeSerialize(result),
    log: log.length ? log : undefined,
  });
}

function snapshotEntityIds(model: any): { faces: Set<string>; edges: Set<string>; vertices: Set<string>; groups: Set<string> } {
  const out = { faces: new Set<string>(), edges: new Set<string>(), vertices: new Set<string>(), groups: new Set<string>() };
  try {
    const mesh = model.doc.geometry.getMesh();
    for (const id of mesh.faces.keys()) out.faces.add(id);
    for (const id of mesh.edges.keys()) out.edges.add(id);
    for (const id of mesh.vertices.keys()) out.vertices.add(id);
    for (const e of model.doc.scene.getAllEntities?.() ?? []) {
      if (e?.type === 'group' || e?.type === 'component_instance') out.groups.add(e.id);
    }
  } catch (e) { console.warn('[AIService.snapshotEntityIds] mesh/scene access failed:', e); }
  return out;
}

function diffEntityIds(
  before: ReturnType<typeof snapshotEntityIds>,
  after: ReturnType<typeof snapshotEntityIds>,
): {
  created: { faces: string[]; edges: string[]; vertices: string[]; groups: string[] };
  removed: { faces: string[]; edges: string[]; vertices: string[]; groups: string[] };
} {
  const added = (b: Set<string>, a: Set<string>) => Array.from(a).filter(id => !b.has(id));
  const gone  = (b: Set<string>, a: Set<string>) => Array.from(b).filter(id => !a.has(id));
  return {
    created: {
      faces:    added(before.faces, after.faces).slice(0, 200),
      edges:    added(before.edges, after.edges).slice(0, 400),
      vertices: added(before.vertices, after.vertices).slice(0, 400),
      groups:   added(before.groups, after.groups).slice(0, 50),
    },
    removed: {
      faces:    gone(before.faces, after.faces).slice(0, 200),
      edges:    gone(before.edges, after.edges).slice(0, 400),
      vertices: gone(before.vertices, after.vertices).slice(0, 400),
      groups:   gone(before.groups, after.groups).slice(0, 50),
    },
  };
}

/** Common JS errors → suggestion. Keeps Claude unstuck. */
function errorHint(msg: string): string | undefined {
  if (/^m is not defined/.test(msg) || /^model is not defined/.test(msg))
    return 'Both `m` and `model` are pre-injected as `DraftDown.activeModel`. You do NOT need (and must NOT have) `const m = ...` at the top — just use `m.` (or `model.`) directly.';
  if (/Cannot read prop.*'(z|x|y|center|width|height|depth)'/.test(msg))
    return 'You probably accessed a property on `undefined`. Common cases: ' +
      '(1) `face.bounds.center` works (bounds returns a Geom.BoundingBox with .center/.width/.height/.depth/.diagonal/.min/.max). ' +
      '(2) `m.api_.createBox(...)` returns `{faceIds, edgeIds, vertexIds}` — the IDs are STRINGS, not wrappers. ' +
      'To get a wrapper from an ID use `m.entities.byId(id)` and check it for null. ' +
      '(3) Material IDs returned by `m.api_.createMaterial(name, color)` are strings — use `m.materials.at(i)` for the wrapper.';
  if (/findEntityById is not a function/.test(msg))
    return 'Use `m.entities.byId(id)` to get the wrapper from an ID (or `m.findEntityById(id)` on the Model). `m.entities.findEntityById` does NOT exist.';
  if (/setFaceMaterial.*is not a function/.test(msg) || /createMaterial.*is not a function/.test(msg))
    return 'Material helpers live on `m.api_`, not on `m.entities`. Use `m.api_.setFaceMaterial(faceIds, materialId)` and `m.api_.createMaterial(name, {r,g,b}, opts?)`.';
  if (/Material .* not found/i.test(msg) || /unknown material/i.test(msg))
    return 'Never hard-code a material UUID — IDs are per-document. Either call `m.api_.createMaterial(name, {r,g,b})` (returns the new ID) or `m.api_.listMaterials()` to find an existing one.';
  if (/face\.material = .* setter on null/i.test(msg) || /Cannot set propert.*material/i.test(msg))
    return 'You probably tried to set .material on a raw ID instead of a wrapper. Either: `m.entities.byId(faceId).material = mat` OR `m.api_.setFaceMaterial([faceId], materialId)`.';
  if (/is not a function/.test(msg))
    return 'A method name is wrong. Common fixes: `m.entities.byId(id)` not findEntityById; `m.api_.createBox(...)` not `m.createBox`; `addFace` not `add_face`; `pushpull` not `push_pull`. Call read_api_reference if unsure.';
  if (/Cannot read prop/.test(msg) || /of undefined/.test(msg) || /of null/.test(msg))
    return 'Likely you used an entity ID that no longer exists, or destructured a return value that was null. Use `read_state` to see live state, or `inspect([id])` to verify the entity still exists.';
  if (/Argument .* must be/.test(msg) || /requires/i.test(msg) || /expected/i.test(msg))
    return 'Wrong argument type. Points → `new Geom.Point3d(x,y,z)`, vectors → `new Geom.Vector3d(x,y,z)`, IDs are strings. Material constructor: `m.api_.createMaterial(name, {r,g,b}, opts?)` with r/g/b in 0..1.';
  if (/await is only valid/.test(msg))
    return 'You wrote `await` inside a non-async helper. The TOP-level script body is async; any helper arrow functions you define need `async` too.';
  if (/at least 3 points/.test(msg) || /3 vertices/.test(msg))
    return 'addFace needs at least 3 distinct, non-collinear points.';
  if (/Boolean .* failed/i.test(msg))
    return 'Boolean ops need watertight (manifold) input solids. Check both regions are closed.';
  if (/origin .* center/i.test(msg) || /negative dimension/i.test(msg))
    return 'createBox origin is the bottom-front-LEFT corner, not the center. To center at point P with dims w×d×h, pass `{x: P.x - w/2, y: P.y, z: P.z - d/2}`.';
  return undefined;
}

/** Per-entity inspection. */
function inspect(api: IModelAPI, ids: string[]): unknown[] {
  const out: unknown[] = [];
  for (const id of ids) {
    const face = api.getFaceInfo(id);
    if (face) {
      out.push({
        id, type: 'face',
        area: round(face.area, 4),
        normal: roundVec(face.normal, 3),
        vertexCount: face.vertexCount,
        vertices: face.vertices.slice(0, 16).map(v => roundVec(v, 3)),
        connectedFaceIds: tryCall(() => api.getConnectedFaces(id), []),
      });
      continue;
    }
    const edge = api.getEdgeInfo(id);
    if (edge) {
      out.push({
        id, type: 'edge',
        length: round(edge.length, 4),
        start: roundVec(edge.startVertex, 3),
        end:   roundVec(edge.endVertex, 3),
        midpoint: roundVec(edge.midpoint, 3),
        adjacentFaceIds: edge.adjacentFaceIds,
      });
      continue;
    }
    const vp = api.getVertexPosition(id);
    if (vp) {
      out.push({ id, type: 'vertex', position: roundVec(vp, 3) });
      continue;
    }
    out.push({ id, error: 'not found' });
  }
  return out;
}

function tryCall<T>(fn: () => T, fallback: T): T { try { return fn(); } catch { return fallback; } }

// ─── helpers ─────────────────────────────────────────────────────

function formatArg(a: unknown): string {
  if (typeof a === 'string') return a;
  try { return JSON.stringify(safeSerialize(a)); } catch { return String(a); }
}

function safeSerialize(v: unknown, depth = 0): unknown {
  if (v == null) return v;
  if (typeof v !== 'object') return v;
  if (depth > 4) return '[…]';
  const anyV = v as any;
  if (typeof anyV.typename === 'function' && typeof anyV.id === 'string') {
    const t = anyV.typename();
    const out: Record<string, unknown> = { type: t, id: anyV.id };
    try {
      if (t === 'Face') out.area = round(anyV.area, 4);
      if (t === 'Face' && anyV.normal) out.normal = roundVec(anyV.normal, 3);
      if (t === 'Edge') out.length = round(anyV.length, 4);
    } catch (e) { console.warn('[AIService.safeSerialize] entity property access failed:', e); }
    return out;
  }
  if (typeof anyV.x === 'number' && typeof anyV.y === 'number' && typeof anyV.z === 'number') {
    return roundVec(anyV, 4);
  }
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => safeSerialize(x, depth + 1));

  const out: Record<string, unknown> = {};
  let count = 0;
  for (const k of Object.keys(anyV)) {
    if (count++ > 24) { out['…'] = `${Object.keys(anyV).length - 24} more keys`; break; }
    try { out[k] = safeSerialize(anyV[k], depth + 1); } catch { out[k] = '[unserializable]'; }
  }
  return out;
}

function round(n: number, p = 3): number { const f = Math.pow(10, p); return Math.round(n * f) / f; }
function roundVec(v: { x: number; y: number; z: number }, p = 3) { return { x: round(v.x, p), y: round(v.y, p), z: round(v.z, p) }; }
function truncate(s: string, n: number): string { return s.length <= n ? s : s.slice(0, n) + '…'; }

// ─── API reference ───────────────────────────────────────────────

function apiReferenceMarkdown(): string {
  const fence = '```';
  return `# DraftDown Ruby API JS façade — DraftDown (full reference)

The core methods are already in the system-prompt cheat sheet. This document covers the
long tail.

## Entities (DraftDown.Entities)
${fence}js
m.entities.length / .count / .each(fn) / .toArray() / .at(i) / .byId(id)
m.entities.addLine(p1, p2) / .addLine([p1, p2, p3, …])
m.entities.addEdges(...points)
m.entities.addFace(p1, p2, p3, ...)
m.entities.addCircle(center, normal, radius, numsegs=24)
m.entities.addArc(center, xaxis, normal, radius, startAng, endAng, numsegs=12)
m.entities.addNgon(center, normal, radius, numsides)
m.entities.addCurve(...points)
m.entities.addGroup(...entities)
m.entities.addInstance(definition, transformation)
m.entities.add3dText(text, alignment?, font?, bold?, italic?, height?, tolerance?, z?, filled?, extrusion?)
m.entities.addText(text, position, vector?)
m.entities.addImage(path, point, width, height)
m.entities.addCline(start, endOrDir, stipple?)
m.entities.addCpoint(point)
m.entities.addDimensionLinear(start, end, offsetVector)
m.entities.addDimensionRadial(edge, leaderVector)
m.entities.addSectionPlane(point, normal, name?)
m.entities.activeSectionPlane() / .clearSectionPlanes()
m.entities.eraseEntities([entities])
m.entities.transformEntities(transformation, [entities])
m.entities.clearAll()
${fence}

## Face / Edge / Vertex
${fence}js
// Face
face.id / face.area / face.normal / face.vertices / face.edges
face.material = mat | id     face.backMaterial = mat | id
face.pushpull(distance, copy=false)
face.reverseInPlace()
face.plane / face.classifyPoint(point)
face.outerLoop().vertices()
face.loops                       // outer + inner (holes)
face.followme(pathEdges)
face.allConnected()

// Edge
edge.id / edge.length / edge.line  ([Point3d, Vector3d])
edge.start / edge.end / edge.vertices / edge.faces
edge.commonFace(other) / edge.otherVertex(vertex) / edge.usedBy(entity)
edge.smooth / edge.soft / edge.hidden  (settable)
edge.curve / edge.explodeCurve() / edge.findFaces() / edge.split(point)
edge.material / edge.material=

// Vertex
vertex.id / vertex.position
vertex.edges / vertex.faces
vertex.commonEdge(other) / vertex.usedBy(entity) / vertex.curveInterior()
${fence}

## Group / ComponentInstance / ComponentDefinition
${fence}js
group.name / group.entities / group.transformation / group.transformInPlace(t)
group.bounds / group.volume / group.guid / group.locked / group.layer
group.copy() / group.makeUnique() / group.toComponent() / group.explode()
instance.definition / instance.transformation / instance.copy() / instance.makeUnique()
definition.name / definition.entities / definition.bounds / definition.behavior
definition.instances() / definition.count
${fence}

## Selection / Materials / Layers / Pages / Definitions
${fence}js
m.selection.add(...entities) / .remove / .toggle / .clear / .invert
m.selection.contains(entity) / .first() / .toArray() / .each(fn)
m.selection.faces() / .edges() / .vertices() / .isCurve() / .isSurface() / .bounds

m.materials.add(name, color) / .at(i|name) / .remove(mat) / .uniqueName(base) / .purgeUnused()
material.name / material.color / material.alpha / material.texture
new Color3('#cc8844')

m.layers.add(name) / .at(i|name) / .remove(layer) / .uniqueName(base) / .purgeUnused()
m.layers.addFolder(name) / .folders
layer.name / layer.visible / layer.color / layer.lineStyle / layer.folder

m.pages.add(name?) / .at(i|name) / .erase(page) / .selectedPage() / .selectPage(p)
page.update() / page.select() / page.transitionTime / page.delayTime

m.definitions.add(name) / .at(i|name|id) / .remove(def) / .purgeUnused() / .uniqueName(base)
m.definitions.load(path)
${fence}

## Geom (DraftDown.Geom)
${fence}js
new Geom.Point3d(x, y, z)         /  new Geom.Point2d(x, y)
new Geom.Vector3d(x, y, z)        /  new Geom.Vector2d(x, y)
v.length / .normalize() / .reverse() / .add(o) / .subtract(o)
v.multiply(s) / .dot(o) / .cross(o) / .angleBetween(o) / .parallel(o) / .perpendicular(o)
p.distance(other) / .vectorTo(other) / .offset(vector, length?)

Geom.Transformation.identity()
Geom.Transformation.translation(point)
Geom.Transformation.scaling(sx, sy?, sz?)
Geom.Transformation.rotation(point, axis, angleRadians)
Geom.Transformation.axes(origin, xAxis, yAxis, zAxis)
t.multiply(other) / t.apply(point) / t.origin / t.xaxis / t.yaxis / t.zaxis

new Geom.BoundingBox().add(point)
bb.center / bb.width / bb.height / bb.depth / bb.diagonal / bb.empty()

Geom.linearCombination(w1, p1, w2, p2)
Geom.fitPlaneToPoints([p1, p2, p3, ...])     // → [a, b, c, d]
Geom.intersectLineLine([p, v], [p, v])
Geom.intersectLinePlane([p, v], [a,b,c,d] | [point, normal])
Geom.intersectPlanePlane([a,b,c,d], [a,b,c,d])  // → [Point3d, Vector3d] | null
Geom.closestPoints([p, v], [p, v])              // → [Point3d, Point3d]
Geom.pointInPolygon2D(point, polygon, checkBorder?)
Geom.tesselate(polygon, holes?)
new Geom.PolygonMesh()
mesh.addPoint(p) / .addPolygon(...indicesOrPoints)

new Geom.Latlong(lat, lng)         // lat/lon → UTM via .toUTM()
new Geom.UTM(zoneNumber, zoneLetter, x, y)  // ↔ Latlong
${fence}

## UI
${fence}js
UI.menu(name).addItem('Label', () => { ... })
UI.menu(name).addSubmenu(label) / .addSeparator()
UI.toolbar(name).addItem({ name, tooltip, smallIcon, handler })
UI.messagebox(msg, type=UI.MB_OK)
UI.inputbox(prompts, defaults, listOptions, title)
UI.beep() / UI.notification(extension, message).show()
await UI.openpanel(title, dir, '*.obj')
await UI.savepanel(title, dir, 'default.obj')
UI.htmlDialog({ dialogTitle, width, height })
UI.setCursor(idOrCss) / UI.createCursor(filename, hotX, hotY)
UI.startTimer(seconds, repeat, fn) / UI.stopTimer(id)
UI.openURL(url) / UI.selectDirectory({title?, default?})
UI.parameters.show({id, title, fields, onChange?, onClose?})
UI.parameters.update(id, partial) / .values(id) / .hide(id)
${fence}
`;
}
