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
