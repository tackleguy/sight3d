import { completedBrowserOperations,generateBrowserResponse } from '../web/browser-ai-protocol';
import type {PhotoInput} from '../../implementations/ai.chat/photo-library';
import { wantsKnowledgeDesign, validateKnowledgeDesign } from '../../implementations/ai.chat/knowledge-design';
import { architectureReferenceContext, REFERENCE_CONTEXT_HEADER, constrainDesignTool, validateDesignRequest, designDemonstration } from '../../implementations/ai.chat/architecture-references';
/** Local-only OpenAI-compatible transport for LM Studio and Ollama. No cloud fallback. */
import type { AIResponse, AIBlock, TurnMessage } from '../../implementations/ai.chat/chat-runner';

export const LOCAL_AI_URL = 'http://127.0.0.1:1234/v1';
export interface LocalAISettings { localAIUrl?: string; localAIModel?: string }
export interface ChatArgs { system: string; messages: TurnMessage[]; tools: unknown[]; photo?:PhotoInput }
type Fetcher = typeof fetch;

export function localBaseURL(value = LOCAL_AI_URL): string {
  const url = new URL(value.trim() || LOCAL_AI_URL);
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use a local server URL on localhost, 127.0.0.1, or [::1]. Remote AI servers are disabled.');
  }
  if (url.pathname !== '/' && url.pathname.replace(/\/$/, '') !== '/v1') throw new Error('Use the server base URL ending in /v1.');
  return `${url.origin}/v1`;
}

async function jsonRequest(url: string, init: RequestInit, fetcher: Fetcher, timeout: number) {
  // The local development server proxies these two fixed loopback targets so
  // browser use does not require weakening a running model server's CORS policy.
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const endpoint = new URL(url);
    if (['localhost', '127.0.0.1'].includes(endpoint.hostname) && endpoint.protocol === 'http:') {
      const provider = endpoint.port === '1234' ? 'lm' : endpoint.port === '11434' ? 'ollama' : null;
      if (provider) url = `/__local_ai/${provider}${endpoint.pathname}`;
    }
  }
  const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(timeout) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || `Local server returned HTTP ${response.status}.`);
  return data;
}

export async function listLocalModels(baseURL: string, fetcher: Fetcher = fetch): Promise<{ models: string[]; error?: string }> {
  try {
    const base = localBaseURL(baseURL);
    const data = await jsonRequest(`${base}/models`, {}, fetcher, 10000);
    if (!Array.isArray(data.data)) throw new Error('The local server did not return a model list. Check the URL in AI settings.');
    const models = data.data.map((m: any) => m.id).filter((id: unknown): id is string => typeof id === 'string' && !!id && !/embed|:cloud\b|-cloud\b/i.test(id));
    return { models };
  } catch (e) { return { models: [], error: localError(e) }; }
}

export function toLocalMessages(system: string, messages: TurnMessage[]): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [{ role: 'system', content: system }];
  for (const message of messages) {
    if (typeof message.content === 'string') { result.push({ role: message.role, content: message.content }); continue; }
    if (!Array.isArray(message.content)) throw new Error('Invalid assistant conversation content. Start a new chat.');
    const blocks = message.content as Array<AIBlock & { tool_use_id?: string; content?: string }>;
    if (message.role === 'assistant') {
      const calls = blocks.filter(b => b.type === 'tool_use').map(b => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
      result.push({ role: 'assistant', content: blocks.filter(b => b.type === 'text').map(b => b.text).join('\n') || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      for (const block of blocks) {
        if (block.type === 'tool_result') result.push({ role: 'tool', tool_call_id: block.tool_use_id, content: block.content ?? '' });
        else if (block.type === 'text') result.push({ role: 'user', content: block.text ?? '' });
      }
    }
  }
  return result;
}

export function fromLocalResponse(data: any): AIResponse {
  const choice = data.choices?.[0];
  if (!choice?.message) throw new Error('The local model returned an empty response. Try another model.');
  if (choice.finish_reason === 'length') return { content: [{ type: 'text', text: choice.message.content || '' }], stop_reason: 'max_tokens' };
  const content: AIBlock[] = [];
  if (choice.message.content) content.push({ type: 'text', text: choice.message.content });
  const calls = choice.message.tool_calls ?? [];
  if (!Array.isArray(calls)) throw new Error('The local model returned invalid tool calls. Try a tool-capable model.');
  for (const [index, call] of calls.entries()) {
    let input;
    try { input = typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function?.arguments; }
    catch { throw new Error('The local model produced invalid tool arguments. No actions from this response were run. Try a smaller request or another model.'); }
    if (!call.function?.name || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The local model returned an incomplete action. Try a tool-capable model.');
    content.push({ type: 'tool_use', id: call.id || `local_${index}`, name: call.function.name, input });
  }
  return { content, stop_reason: calls.length ? 'tool_use' : 'end_turn' };
}

export async function chatLocal(args: ChatArgs, settings: LocalAISettings, fetcher: Fetcher = fetch): Promise<AIResponse> {
  try {
    const completed=completedBrowserOperations(args);if(completed)return completed;
    const base = localBaseURL(settings.localAIUrl);
    // Check installed models before sending any prompt; do not ask Ollama to use a cloud model.
    const available = await listLocalModels(base, fetcher);
    if (available.error) throw new Error(available.error);
    const model = settings.localAIModel?.trim() || available.models[0];
    if (!model || !available.models.includes(model)) throw new Error('Load a local chat model in LM Studio or Ollama, then choose it in AI settings.');
    if(args.photo) {
      try {return await generateBrowserResponse(args,request=>jsonRequest(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,model,response_format:{type:'json_schema',json_schema:{name:'photo_design',strict:true,schema:JSON.parse(request.response_format!.schema)}}})},fetcher,180000));}
      catch(error){throw new Error('Photo modeling needs a local vision-capable model with structured JSON output. '+(error instanceof Error?error.message:String(error)));}
    }
    const latestText=String([...args.messages].reverse().find(m=>m.role==='user'&&typeof m.content==='string')?.content||'').split('\n\n').pop()!;
    const knowledge=wantsKnowledgeDesign(latestText)&&args.tools.some((t:any)=>t.name==='create_design');
    const selectedTools=knowledge?args.tools.filter((t:any)=>t.name==='create_design').map((t:any)=>constrainDesignTool(t,latestText)):args.tools;
    const tools = selectedTools.map((tool: any) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.input_schema } }));
    const sourceContext=args.system.includes(REFERENCE_CONTEXT_HEADER)?'':architectureReferenceContext(latestText);
    let correction='';
    for(let attempt=0;attempt<2;attempt++) {
      const conversation=toLocalMessages(args.system+sourceContext+correction,args.messages);
      if(knowledge)conversation.splice(1,0,...designDemonstration(latestText));
      const data = await jsonRequest(`${base}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages:conversation, stream:false, max_tokens:4096, temperature:0.2, ...(tools.length?{tools,...(knowledge?{tool_choice:{type:'function',function:{name:'create_design'}}}:{})}:{}) }),
      }, fetcher, 180000);
      try {
        const response=fromLocalResponse(data);
        if(knowledge&&response.stop_reason==='max_tokens')throw new Error('The design was cut short. Return a shorter complete assembly; omit optional arguments.');
        if(knowledge&&!response.content?.some(b=>b.type==='tool_use'&&b.name==='create_design'))throw new Error('Use create_design to build the requested assembly; a text-only claim cannot create geometry.');
        if(knowledge&&response.content?.filter(b=>b.type==='tool_use').length!==1)throw new Error('Return exactly one create_design action for the complete assembly.');
        for(const block of response.content||[])if(block.type==='tool_use'){
          if(knowledge&&block.name!=='create_design')throw new Error('Use the available create_design action.');
          if(block.name==='create_design'){validateKnowledgeDesign(block.input||{});validateDesignRequest(block.input||{},latestText);}
        }
        return response;
      } catch(error) {
        if(!knowledge||attempt===1)throw error;
        correction='\nThe previous plan was rejected before execution: '+(error instanceof Error?error.message:String(error))+'. Return a corrected complete plan using the supplied sources and worked geometry examples.';
      }
    }
    throw new Error('No complete design was generated.');
  } catch (e) { return { error: localError(e) }; }
}

function localError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/fetch failed|failed to fetch|networkerror|load failed/i.test(message)) return 'Cannot reach local AI. Start the LM Studio or Ollama server and check AI settings. In a browser, enable CORS on the local server.';
  if (/timeout|aborted/i.test(message)) return 'Local AI timed out. Try a smaller model or a shorter request, then retry.';
  return message;
}
