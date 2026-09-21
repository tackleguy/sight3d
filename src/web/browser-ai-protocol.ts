import { architectureReferenceContext, REFERENCE_CONTEXT_HEADER, constrainDesignTool, validateDesignRequest, designDemonstration } from '../../implementations/ai.chat/architecture-references';
import { wantsKnowledgeDesign, KNOWLEDGE_DESIGN_PROMPT, validateKnowledgeDesign } from '../../implementations/ai.chat/knowledge-design';
import { findBuildingArchetype, buildingCatalogContext, inferBuildingUse } from '../../implementations/ai.chat/building-catalog';
import type { AIResponse, AIBlock } from '../../implementations/ai.chat/chat-runner';
import type { ChatArgs } from '../core/local-ai';
import {photoDesignRequest,validatePhotoDesign} from '../../implementations/ai.chat/photo-design';

export function browserTools(args: ChatArgs) {
  const tools = args.tools as Array<{ name: string; description: string; input_schema: unknown }>;
  if(args.photo)return tools.filter(t=>t.name==='create_design');
  const latest = [...args.messages].reverse().find(m => m.role === 'user' && typeof m.content === 'string');
  const prompt = typeof latest?.content === 'string' ? latest.content : '';
  const assistant = [...args.messages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string');
  const previousReply = typeof assistant?.content === 'string' ? assistant.content : '';
  const request = prompt.split('\n\n').pop()!.trim();
  if(wantsKnowledgeDesign(request)&&tools.some(t=>t.name==='create_design'))return tools.filter(t=>t.name==='create_design').map(t=>constrainDesignTool(t,request));
  if(/\b(search|find|show|list|browse)\b/i.test(request)&&/\b(examples|references|real buildings|team stadiums)\b/i.test(request)&&tools.some(t=>t.name==='search_architecture_references'))return tools.filter(t=>t.name==='search_architecture_references');
  const tower = /\b(skyscraper|skysraper|high[- ]?rise|tower|building|house|home|cottage|villa|apartment|office|warehouse|pavilion|museum|library|school|civic|stadium|arena)\b/i;
  // A browser model reliably fills parameters when it isn't distracted by a general
  // JavaScript tool. Learn mode still has no tools, and other edits keep theirs.
  const detail = (tower.test(prompt) || (/^(?:please )?add (?:more |extra )?detail[.!]?$/i.test(request) && tower.test(previousReply))) && /\b(add|more|increase|extra|next)\b[^.!?]*\bdetail\b/i.test(prompt);
  const create = (tower.test(request) || !!findBuildingArchetype(request) || !!inferBuildingUse(request)) && /\b(create|build|make|design|generate)\b/i.test(prompt);
  const city = (/\b(neighborhood|neighbourhood|skyline|city block|district)\b/i.test(request) || /\bbuildings\b/i.test(request) || (/\bcity\b/i.test(request) && !tower.test(request))) && /\b(create|build|make|design|generate)\b/i.test(request);
  const available = (preferred:string, fallback:string) => tools.some(tool=>tool.name===preferred)?preferred:fallback;
  const object = /\b(sphere|ball|cylinder|cone|torus|donut|arc|table|chair|glass of water|water volume)\b/i.test(request) && /\b(create|build|make|draw|add|generate)\b/i.test(request);
  const browse = /\b(list|browse|search|find|show|what)\b/i.test(request) && /\b(types|subtypes|catalog|kinds|recipes)\b/i.test(request);
  const name = browse ? 'search_building_catalog' : object && !create ? 'create_object' : detail ? available('detail_building','detail_skyscraper') : city ? 'create_city' : create ? available('create_building','create_skyscraper') : null;
  return name && tools.some(tool => tool.name === name) ? tools.filter(tool => tool.name === name) : tools;
}
export function browserRequest(args: ChatArgs, retry = false) {
  if(args.photo){if(!(args.tools as {name:string}[]).some(t=>t.name==='create_design'))throw new Error('Photo creation is available only in Create mode.');const latest=[...args.messages].reverse().find(m=>m.role==='user'&&typeof m.content==='string');return photoDesignRequest(args.photo,String(latest?.content||'').split('\n\n').pop()!,retry);}
  const tools = browserTools(args);
  const latestText=[...args.messages].reverse().find(m=>m.role==='user'&&typeof m.content==='string')?.content;
  const knowledge=tools.length===1&&tools[0].name==='create_design';
  const retrieved=!knowledge&&typeof latestText==='string'?buildingCatalogContext(latestText.split('\n\n').pop()!):'';
  const catalog=args.system.includes(retrieved)?'':retrieved;
  const referenceContext=knowledge&&typeof latestText==='string'&&!args.system.includes(REFERENCE_CONTEXT_HEADER)?architectureReferenceContext(latestText.split('\n\n').pop()!):'';
  const base = args.system + (knowledge&&!args.system.includes(KNOWLEDGE_DESIGN_PROMPT)?'\n'+KNOWLEDGE_DESIGN_PROMPT:'') + catalog + (retry ? '\nYour previous response was cut short and was NOT executed. Produce a shorter complete answer or plan. Use concise arguments; do not repeat explanations.' : '') + '\nYou run inside the visitor’s browser. Keep answers short. Only tools can edit geometry. Never claim a change without a successful tool result.';
  // Reserve context space for the output rather than sending four full scene dumps.
  let remaining = 6000;
  const messages = args.messages.slice(-4).reverse().map(m => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    const content = remaining > 0 ? text.slice(-Math.min(remaining, 4000)) : '';
    remaining -= content.length;
    return { role: m.role as 'user' | 'assistant', content };
  }).filter(m => m.content).reverse();
  if (!tools.length) return { messages: [{ role: 'system' as const, content: base }, ...messages], temperature: 0.2, max_tokens: retry ? 2048 : 1024, stream: false as const };
  // An explicit UI/prompt detail level is a constraint, not a model suggestion.
  const lastUser = [...args.messages].reverse().find(m => m.role === 'user' && typeof m.content === 'string');
  const detail = typeof lastUser?.content === 'string' ? lastUser.content.match(/\bdetail(?:\s+level)?\s*[:=]?\s*([123])\b/i)?.[1] : undefined;
  const inputSchema = (tool: typeof tools[number]) => {
    const schema = tool.input_schema as { properties?: Record<string,unknown>; required?: string[] };
    return ['create_skyscraper','create_building','create_city'].includes(tool.name) && detail ? { ...schema, properties: { ...schema.properties, detail: { const: Number(detail) } }, required: [...new Set([...(schema.required || []), 'detail'])] } : schema;
  };
  const architecture = tools.length === 1 && ['create_design','create_building','create_city','detail_building','search_building_catalog','search_architecture_references'].includes(tools[0].name);
  const schema = { type: 'object', properties: {
    reply: architecture ? { const: '' } : { type: 'string' },
    calls: { type: 'array', minItems: architecture ? 1 : 0, maxItems: architecture ? 1 : 6, items: { anyOf: tools.map(tool => ({ type: 'object', properties: { name: { const: tool.name }, arguments: inputSchema(tool) }, required: ['name', 'arguments'], additionalProperties: false })) } },
  }, required: ['reply', 'calls'], additionalProperties: false };
  return {
    messages: [{ role: 'system' as const, content: base + '\nReturn concise JSON with reply and calls. Omit optional arguments unless needed by the request. Do not write an explanation before a tool call; successful tools provide the final confirmation. Each call has name and arguments (a JSON object matching the tool schema). For knowledge-inspired multipart designs use create_design. For objects and arcs use create_object, and for painting existing faces use apply_surface. For explicit quick/preset architecture use create_building. Otherwise use create_design to express the sourced reference features; do not substitute a catalog recipe. For city-inspired blocks use create_city. For more detail use detail_building. Only simple boxes use create_box. After success, return a brief reply and calls:[]; never repeat a completed action.  Available tools:\n' + JSON.stringify(tools) + referenceContext }, ...(knowledge?designDemonstration(String(latestText||'')):[]), ...messages],
    temperature: 0, max_tokens: knowledge ? (retry ? 4096 : 3072) : (retry ? 3072 : 2048), stream: false as const,
    response_format: { type: 'json_object' as const, schema: JSON.stringify(schema) },
  };
}
let sequence = 0;
export function parseBrowserReply(text: string, tools: unknown[], finishReason: string | null): AIResponse {
  if (finishReason === 'length') throw new Error('The browser model reached its response limit. Try a smaller change.');
  if (!tools.length) return { content: [{ type: 'text', text }], stop_reason: 'end_turn' };
  const result = JSON.parse(text);
  if (typeof result.reply !== 'string' || !Array.isArray(result.calls) || result.calls.length > 6) throw new Error('The browser model returned an invalid plan. Try a simpler request.');
  const allowed = new Set((tools as Array<{name:string}>).map(t => t.name));
  const content: AIBlock[] = !result.calls.length && result.reply ? [{ type:'text', text:result.reply }] : [];
  // Validate the complete plan before returning any executable action.
  for (const call of result.calls) {
    if (!allowed.has(call.name)) throw new Error('The browser model requested an unavailable action. No actions were run.');
    const input = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The browser model returned invalid action inputs. No actions were run.');
    if(call.name==='create_design')validateKnowledgeDesign(input);
    content.push({ type:'tool_use', id:`browser_${++sequence}`, name:call.name, input });
  }
  if (!content.length) throw new Error('The browser model returned no answer. Please try again.');
  return { content, stop_reason:result.calls.length ? 'tool_use' : 'end_turn' };
}

/** Finish procedural modeling plans from actual tool receipts, without another generation. */
export function completedBrowserOperations(args: ChatArgs): AIResponse | null {
  const previous = args.messages[args.messages.length - 2], last = args.messages[args.messages.length - 1];
  if (previous?.role !== 'assistant' || last?.role !== 'user' || !Array.isArray(previous.content) || !Array.isArray(last.content)) return null;
  const calls = previous.content.filter((block: any) => block.type === 'tool_use');
  if(calls.length && calls.every((call:any)=>call.name==='search_architecture_references')) {
    const summaries:string[]=[];
    for(const call of calls){
      const receipt=last.content.find((b:any)=>b.type==='tool_result'&&b.tool_use_id===call.id);if(!receipt)return null;
      let data;try{data=JSON.parse(receipt.content);}catch{return null;}
      if(!Array.isArray(data.results))return {error:data.error||'Reference search failed.'};
      summaries.push(data.results.length?data.results.map((r:any)=>`• [${r.name}](${r.source}) — ${r.categories.join(', ')}${r.heightM?`; ${r.heightM} m`:''}${r.features?`; ${r.features.join('; ')}`:''}. Reference ID: ${r.id}`).join('\n'):'No matching sourced examples in this snapshot. This is a coverage gap.');
      if(data.city)summaries.push(`${data.city.name}: ${data.city.nearbyExampleCount} nearby examples; ${data.city.directExampleCount||0} directly assigned city examples. These records do not establish municipal boundaries.`);
      summaries.push('References guide new designs; they are not measured replicas or model-weight training.');
    }
    return {content:[{type:'text',text:summaries.join('\n\n')}],stop_reason:'end_turn'};
  }
  if(calls.length && calls.every((call:any)=>call.name==='search_building_catalog')) {
    const descriptions:string[]=[];
    for(const call of calls){
      const receipt=last.content.find((block:any)=>block.type==='tool_result'&&block.tool_use_id===call.id);
      if(!receipt)return null;
      let result;try{result=JSON.parse(receipt.content);}catch{return null;}
      if(!Array.isArray(result.results))return {error:result.error||'The catalog search did not finish.'};
      descriptions.push(`${result.recipeCount.toLocaleString()} configurable building recipes: ${result.subtypeCount} subtypes × 10 styles × 10 forms.\n${result.results.map((item:any)=>`• ${item.name} (${item.coverage==='family'?'family concept; ':''}${item.category}) — ${item.dimensions.width} × ${item.dimensions.depth} m, ${item.dimensions.height} m tall; ${item.feature.replace(/_/g,' ')}. ID: ${item.id}`).join('\n')}\n${result.results.length?'Ask to create one of these, with any dimensions you want.':'No matching subtypes. Try a broader category, or ask to create a building by name for an explicitly approximate concept.'}${result.nextOffset!==null?` More results: search with offset ${result.nextOffset}.`:''}`);
    }
    return {content:[{type:'text',text:descriptions.join('\n\n')}],stop_reason:'end_turn'};
  }
  if (!calls.length || calls.some((call: any) => !['create_design','create_object','create_box','create_skyscraper','detail_skyscraper','create_building','create_city','detail_building'].includes(call.name))) return null;
  const receipts = last.content;
  const descriptions: string[] = [];
  for (const call of calls) {
    const receipt = receipts.find((block: any) => block.type === 'tool_result' && block.tool_use_id === call.id);
    if (!receipt) return null;
    let result;
    try { result = JSON.parse(receipt.content); } catch { return null; }
    if (!result || typeof result !== 'object') return null;
    if (result.ok !== true || !Array.isArray(result.created?.faces) || (call.name === 'create_box' ? result.created.faces.length !== 6 : !result.created.faces.length)) {
      return { error: `The modeling plan did not finish successfully. ${result.error || 'No completed geometry was reported.'} Review any completed operations before retrying.` };
    }
    if (call.name !== 'create_box') { descriptions.push(String(result.summary)); continue; }
    const input = call.input;
    descriptions.push(`${input.width} × ${input.depth} × ${input.height} m box at (${input.x ?? 0}, ${input.y ?? 0}, ${input.z ?? 0})`);
  }
  return { content: [{ type: 'text', text: calls.every((call: any) => call.name === 'create_box') ? `Created ${descriptions.join('; ')}. You can undo each box.` : descriptions.join('\n') }], stop_reason: 'end_turn' };
}

/** Retry an unfinished plan before exposing any executable tool calls. */
export async function generateBrowserResponse(
  args: ChatArgs,
  generate: (request: ReturnType<typeof browserRequest>) => Promise<{choices: Array<{message:{content?:string|null};finish_reason?:string|null}>}>,
  stopped: () => boolean = () => false,
): Promise<AIResponse> {
  let correction='';
  for(let attempt=0;attempt<2;attempt++) {
    if(stopped())throw new Error('Generation stopped.');
    const request=browserRequest(args,attempt===1);
    if(correction)request.messages[0].content+='\nThe previous plan was rejected before execution: '+correction+'. Return a corrected complete plan with short, nonempty name, reference and features.';
    const reply=await generate(request);
    if(stopped())throw new Error('Generation stopped.');
    const choice=reply.choices[0];
    if(choice?.finish_reason==='length' && attempt===0)continue;
    try{
      const parsed=parseBrowserReply(choice?.message.content||'',browserTools(args),choice?.finish_reason??null);
      const latest=[...args.messages].reverse().find(m=>m.role==='user'&&typeof m.content==='string');
      if(args.photo&&parsed.content?.filter(b=>b.type==='tool_use').length!==1)throw new Error('Return exactly one complete photo design.');
      for(const block of parsed.content||[])if(block.type==='tool_use'&&block.name==='create_design'){if(args.photo)validatePhotoDesign(block.input||{});else validateDesignRequest(block.input||{},String(latest?.content||'').split('\n\n').pop()!);}
      return parsed;
    }
    catch(error){if(attempt===0&&browserTools(args).some(t=>t.name==='create_design')){correction=error instanceof Error?error.message:'Invalid design plan';continue;}throw error;}
  }
  throw new Error('No complete response was generated.');
}
