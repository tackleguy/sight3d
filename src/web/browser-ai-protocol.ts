import type { AIResponse, AIBlock } from '../../implementations/ai.chat/chat-runner';
import type { ChatArgs } from '../core/local-ai';

export function browserTools(args: ChatArgs) {
  const tools = args.tools as Array<{ name: string; description: string; input_schema: unknown }>;
  const latest = [...args.messages].reverse().find(m => m.role === 'user' && typeof m.content === 'string');
  const prompt = typeof latest?.content === 'string' ? latest.content : '';
  const assistant = [...args.messages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string');
  const previousReply = typeof assistant?.content === 'string' ? assistant.content : '';
  const request = prompt.split('\n\n').pop()!.trim();
  const tower = /\b(skyscraper|skysraper|high[- ]?rise|tower|building|house|home|cottage|villa|apartment|office|warehouse|pavilion|museum|library|school|civic)\b/i;
  // A tiny model reliably fills parameters when it isn't distracted by a general
  // JavaScript tool. Learn mode still has no tools, and other edits keep theirs.
  const detail = (tower.test(prompt) || (/^(?:please )?add (?:more |extra )?detail[.!]?$/i.test(request) && tower.test(previousReply))) && /\b(add|more|increase|extra|next)\b[^.!?]*\bdetail\b/i.test(prompt);
  const create = tower.test(prompt) && /\b(create|build|make|design|generate)\b/i.test(prompt);
  const city = (/\b(neighborhood|neighbourhood|skyline|city block|district)\b/i.test(request) || /\bbuildings\b/i.test(request) || (/\bcity\b/i.test(request) && !tower.test(request))) && /\b(create|build|make|design|generate)\b/i.test(request);
  const available = (preferred:string, fallback:string) => tools.some(tool=>tool.name===preferred)?preferred:fallback;
  const name = detail ? available('detail_building','detail_skyscraper') : city ? 'create_city' : create ? available('create_building','create_skyscraper') : null;
  return name && tools.some(tool => tool.name === name) ? tools.filter(tool => tool.name === name) : tools;
}
export function browserRequest(args: ChatArgs, retry = false) {
  const tools = browserTools(args);
  const base = args.system + (retry ? '\nYour previous response was cut short and was NOT executed. Produce a shorter complete answer or plan. Use concise arguments; do not repeat explanations.' : '') + '\nYou run inside the visitor’s browser. Keep answers short. Only tools can edit geometry. Never claim a change without a successful tool result.';
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
  const architecture = tools.length === 1 && ['create_building','create_city','detail_building'].includes(tools[0].name);
  const schema = { type: 'object', properties: {
    reply: architecture ? { const: '' } : { type: 'string' },
    calls: { type: 'array', minItems: architecture ? 1 : 0, maxItems: architecture ? 1 : 6, items: { anyOf: tools.map(tool => ({ type: 'object', properties: { name: { const: tool.name }, arguments: inputSchema(tool) }, required: ['name', 'arguments'], additionalProperties: false })) } },
  }, required: ['reply', 'calls'], additionalProperties: false };
  return {
    messages: [{ role: 'system' as const, content: base + '\nReturn concise JSON with reply and calls. Omit optional arguments unless needed by the request. Do not write an explanation before a tool call; successful tools provide the final confirmation. Each call has name and arguments (a JSON object matching the tool schema). For architecture use create_building with varied shapes, types, dimensions and roofs. For city-inspired blocks use create_city. For more detail use detail_building. Only simple boxes use create_box. After success, return a brief reply and calls:[]; never repeat a completed action.  Available tools:\n' + JSON.stringify(tools) }, ...messages],
    temperature: 0, max_tokens: retry ? 3072 : 2048, stream: false as const,
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
  if (!calls.length || calls.some((call: any) => !['create_box','create_skyscraper','detail_skyscraper','create_building','create_city','detail_building'].includes(call.name))) return null;
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
  for(let attempt=0;attempt<2;attempt++) {
    if(stopped())throw new Error('Generation stopped.');
    const reply=await generate(browserRequest(args,attempt===1));
    if(stopped())throw new Error('Generation stopped.');
    const choice=reply.choices[0];
    if(choice?.finish_reason==='length' && attempt===0)continue;
    return parseBrowserReply(choice?.message.content||'',browserTools(args),choice?.finish_reason??null);
  }
  throw new Error('No complete response was generated.');
}
