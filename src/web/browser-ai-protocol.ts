import type { AIResponse, AIBlock } from '../../implementations/ai.chat/chat-runner';
import type { ChatArgs } from '../core/local-ai';

export function browserRequest(args: ChatArgs) {
  const tools = args.tools as Array<{ name: string; description: string; input_schema: unknown }>;
  const base = args.system + '\nYou run inside the visitor’s browser. Keep answers short. Only tools can edit geometry. Never claim a change without a successful tool result.';
  const messages = args.messages.slice(-4).map(m => ({ role: m.role as 'user' | 'assistant', content: (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).slice(-5000) }));
  if (!tools.length) return { messages: [{ role: 'system' as const, content: base }, ...messages], temperature: 0.2, max_tokens: 512, stream: false as const };
  const schema = { type: 'object', properties: {
    reply: { type: 'string' },
    calls: { type: 'array', maxItems: 6, items: { type: 'object', properties: { name: { type: 'string', enum: tools.map(t => t.name) }, arguments: { type: 'string' } }, required: ['name', 'arguments'], additionalProperties: false } },
  }, required: ['reply', 'calls'], additionalProperties: false };
  return {
    messages: [{ role: 'system' as const, content: base + '\nReturn JSON with reply and calls. Each call has name and arguments (a JSON-encoded object string). For boxes use create_box. After success, return a brief reply and calls:[]; never repeat a completed action. Example: {"reply":"","calls":[{"name":"create_box","arguments":"{\\"width\\":1,\\"depth\\":1,\\"height\\":1}"}]}. Available tools:\n' + JSON.stringify(tools) }, ...messages],
    temperature: 0, max_tokens: 1024, stream: false as const,
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
    if (!allowed.has(call.name) || typeof call.arguments !== 'string') throw new Error('The browser model requested an unavailable action. No actions were run.');
    const input = JSON.parse(call.arguments);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The browser model returned invalid action inputs. No actions were run.');
    content.push({ type:'tool_use', id:`browser_${++sequence}`, name:call.name, input });
  }
  if (!content.length) throw new Error('The browser model returned no answer. Please try again.');
  return { content, stop_reason:result.calls.length ? 'tool_use' : 'end_turn' };
}

/** Finish direct box plans from actual tool receipts, without another generation. */
export function completedBrowserBoxes(args: ChatArgs): AIResponse | null {
  const previous = args.messages[args.messages.length - 2], last = args.messages[args.messages.length - 1];
  if (previous?.role !== 'assistant' || last?.role !== 'user' || !Array.isArray(previous.content) || !Array.isArray(last.content)) return null;
  const calls = previous.content.filter((block: any) => block.type === 'tool_use');
  if (!calls.length || calls.some((call: any) => call.name !== 'create_box')) return null;
  const receipts = last.content;
  const descriptions: string[] = [];
  for (const call of calls) {
    const receipt = receipts.find((block: any) => block.type === 'tool_result' && block.tool_use_id === call.id);
    if (!receipt) return null;
    let result;
    try { result = JSON.parse(receipt.content); } catch { return null; }
    if (!result || typeof result !== 'object') return null;
    if (result.ok !== true || !Array.isArray(result.created?.faces) || result.created.faces.length !== 6) {
      return { error: `The box plan did not finish successfully. ${result.error || 'No complete box was reported.'} Review any completed operations before retrying.` };
    }
    const input = call.input;
    descriptions.push(`${input.width} × ${input.depth} × ${input.height} m box at (${input.x ?? 0}, ${input.y ?? 0}, ${input.z ?? 0})`);
  }
  return { content: [{ type: 'text', text: `Created ${descriptions.join('; ')}. You can undo each box.` }], stop_reason: 'end_turn' };
}
