import { chatLocal, fromLocalResponse, listLocalModels, localBaseURL, toLocalMessages } from '../../../src/core/local-ai';

const json = (data: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => data });
const transport = (...responses: unknown[]) => jest.fn(async () => json(responses.shift())) as unknown as jest.MockedFunction<typeof fetch>;

test('allows only loopback HTTP servers and normalizes the API root', () => {
  expect(localBaseURL('http://localhost:1234')).toBe('http://localhost:1234/v1');
  expect(localBaseURL('http://[::1]:11434/v1/')).toBe('http://[::1]:11434/v1');
  for (const url of ['https://api.anthropic.com', 'http://localhost.evil.test', 'http://user:secret@localhost:1234', 'file:///tmp/model', 'http://127.0.0.1:1234/v1?redirect=remote']) expect(() => localBaseURL(url)).toThrow();
});
test('converts tool requests and results without losing call IDs', () => {
  const converted = toLocalMessages('system', [
    { role: 'assistant', content: [{ type: 'text', text: 'Working' }, { type:'tool_use', id:'call_1', name:'execute_script', input:{script:'box()'} }] },
    { role:'user', content:[{ type:'tool_result', tool_use_id:'call_1', content:'{"ok":true}' }] },
  ]);
  expect(converted[1]).toMatchObject({ role:'assistant', tool_calls:[{ id:'call_1', function:{ name:'execute_script', arguments:'{"script":"box()"}' } }] });
  expect(converted[2]).toEqual({ role:'tool', tool_call_id:'call_1', content:'{"ok":true}' });
});
test('adapts local tool calls to the existing modeling loop', () => {
  expect(fromLocalResponse({ choices:[{ message:{content:null, tool_calls:[{id:'a',function:{name:'inspect', arguments:'{"ids":[]}'}}]}, finish_reason:'tool_calls'}] })).toEqual({content:[{type:'tool_use',id:'a',name:'inspect',input:{ids:[]}}],stop_reason:'tool_use'});
});
test('rejects malformed arguments before any action can execute', () => {
  expect(() => fromLocalResponse({choices:[{message:{tool_calls:[{function:{name:'execute_script', arguments:'not json'}}]}}]})).toThrow('invalid tool arguments');
});
test('never exposes truncated tool calls for execution', () => {
  const result = fromLocalResponse({choices:[{finish_reason:'length',message:{tool_calls:[{function:{name:'execute_script', arguments:'broken'}}]}}]});
  expect(result.stop_reason).toBe('max_tokens');
  expect(result.content?.some(c => c.type === 'tool_use')).toBe(false);
});
test('discovers local chat models, excluding embeddings and cloud models', async () => {
  const mock = transport({data:[{id:'local-model'},{id:'nomic-embed'},{id:'qwen:cloud'},{id:'gpt-oss-cloud'}]});
  expect(await listLocalModels('http://localhost:1234', mock)).toEqual({models:['local-model']});
  expect(mock.mock.calls[0][1]).toMatchObject({ redirect:'error' });
});
test('sends chat only to localhost without authorization or cloud fallback', async () => {
  const mock = transport({data:[{id:'local-model'}]}, {choices:[{message:{content:'Hello'},finish_reason:'stop'}]});
  expect(await chatLocal({system:'Be helpful',messages:[{role:'user',content:'Hi'}],tools:[]},{},mock)).toMatchObject({content:[{text:'Hello'}]});
  const [url, init] = mock.mock.calls[1];
  expect(url).toBe('http://127.0.0.1:1234/v1/chat/completions');
  expect(init?.headers).toEqual({'Content-Type':'application/json'});
  expect(JSON.parse(String(init?.body)).tools).toBeUndefined();
});
test('does not send prompts if a configured model is missing', async () => {
  const mock = transport({data:[]});
  const result = await chatLocal({system:'private',messages:[],tools:[]},{localAIModel:'missing'},mock);
  expect(result.error).toMatch(/Load a local/);
  expect(mock).toHaveBeenCalledTimes(1);
});
test('blocked remote configuration never makes a request', async () => {
  const mock = transport();
  const result = await chatLocal({system:'private',messages:[],tools:[]},{localAIUrl:'https://example.com/v1'},mock);
  expect(result.error).toMatch(/Remote AI servers are disabled/);
  expect(mock).not.toHaveBeenCalled();
});
