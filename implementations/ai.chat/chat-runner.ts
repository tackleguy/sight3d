/** Provider-independent turn loop. Stop is cooperative: an executing operation finishes. */
export interface AIBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}
export interface AIResponse {
  content?: AIBlock[];
  stop_reason?: string;
  error?: string | { message?: string };
}
export interface TurnMessage { role: string; content: unknown }
export interface ToolResult { name: string; input: Record<string, unknown>; result: string }
export async function runChatTurn(options: {
  messages: TurnMessage[];
  request: (messages: TurnMessage[]) => Promise<AIResponse>;
  execute: (name: string, input: Record<string, unknown>) => Promise<string>;
  stopped: () => boolean;
  onProgress: (text: string) => void;
  onTool: (tool: ToolResult) => void;
  allowEdits: boolean;
  maxRounds?: number;
}) {
  let history = [...options.messages];
  const text: string[] = [];
  const limit = options.maxRounds ?? 25;
  for (let round = 0; round < limit; round++) {
    if (options.stopped()) return { text: text.join('\n\n'), stopped: true };
    options.onProgress(round ? 'Reviewing the model…' : 'Thinking through your request…');
    const response = await options.request(history);
    if (options.stopped()) return { text: text.join('\n\n'), stopped: true };
    if (response.error) throw new Error(typeof response.error === 'string' ? response.error : response.error.message || 'The AI provider could not complete the request.');
    if (!Array.isArray(response.content) || !response.content.length) throw new Error('The AI returned an empty response. Please try again.');
    for (const block of response.content) if (block.type === 'text' && block.text) text.push(block.text);
    const calls = response.content.filter(block => block.type === 'tool_use');
    if (!calls.length) {
      if (response.stop_reason === 'max_tokens') throw new Error('The response reached its length limit. Try a smaller request.');
      return { text: text.join('\n\n'), stopped: false };
    }
    // Never run a truncated script or tools supplied in teaching mode.
    if (response.stop_reason === 'max_tokens') throw new Error('The modeling instructions were cut short. Try one smaller change.');
    if (!options.allowEdits) throw new Error('Learn mode cannot change the model. Switch to Build to make edits.');
    const results = [];
    for (const call of calls) {
      if (options.stopped()) return { text: text.join('\n\n'), stopped: true };
      if (!call.id || !call.name || !call.input) throw new Error('The AI returned an incomplete modeling action. Please try again.');
      options.onProgress(call.name === 'execute_script' ? String(call.input.operationName || 'Updating the model…') : 'Inspecting the model…');
      const result = await options.execute(call.name, call.input);
      options.onTool({ name: call.name, input: call.input, result });
      results.push({ type: 'tool_result', tool_use_id: call.id, content: result });
    }
    history = [...history, { role: 'assistant', content: response.content }, { role: 'user', content: results }];
  }
  throw new Error('The assistant reached its action limit. Review the model, then ask for the next step.');
}
