import { runChatTurn, AIResponse } from '../../../implementations/ai.chat/chat-runner';

const action: AIResponse = { content: [{ type:'text', text:'Building.' }, { type:'tool_use', id:'one', name:'execute_script', input:{ script:'box()', operationName:'Box' } }], stop_reason:'tool_use' };
function setup(responses: AIResponse[]) {
  const request = jest.fn(async () => responses.shift()!);
  const execute = jest.fn(async () => '{"ok":true}');
  const onTool = jest.fn();
  return { messages:[{ role:'user', content:'Make a box' }], request, execute, stopped:() => false, onProgress:jest.fn(), onTool, allowEdits:true };
}

test('executes modeling actions, returns tool results, and includes each text block once', async () => {
  const options = setup([action, { content:[{ type:'text', text:'Done.' }], stop_reason:'end_turn' }]);
  expect(await runChatTurn(options)).toEqual({ text:'Building.\n\nDone.', stopped:false });
  expect(options.execute).toHaveBeenCalledTimes(1);
  expect(options.onTool).toHaveBeenCalledTimes(1);
  expect((options.request.mock.calls as unknown[][])[1][0]).toEqual(expect.arrayContaining([expect.objectContaining({ role:'user', content:expect.arrayContaining([expect.objectContaining({ tool_use_id:'one' })]) })]));
});
test('normalizes provider errors instead of treating them as assistant text', async () => {
  const options = setup([{ error:{ message:'Invalid API key' } }]);
  await expect(runChatTurn(options)).rejects.toThrow('Invalid API key');
  expect(options.execute).not.toHaveBeenCalled();
});
test('Learn mode never executes a returned tool', async () => {
  const options = { ...setup([action]), allowEdits:false };
  await expect(runChatTurn(options)).rejects.toThrow('Learn mode');
  expect(options.execute).not.toHaveBeenCalled();
});
test('stopping during a provider request prevents subsequent mutations', async () => {
  let stopped = false;
  const options = { ...setup([]), stopped:() => stopped, request:async () => { stopped = true; return action; } };
  expect((await runChatTurn(options)).stopped).toBe(true);
  expect(options.execute).not.toHaveBeenCalled();
});
test('stopping between tools prevents the second action', async () => {
  let stopped = false;
  const options = { ...setup([{ ...action, content:[...action.content!, { ...action.content![1], id:'two' }] }]), stopped:() => stopped };
  options.execute.mockImplementation(async () => { stopped = true; return '{"ok":true}'; });
  expect((await runChatTurn(options)).stopped).toBe(true);
  expect(options.execute).toHaveBeenCalledTimes(1);
});
test('truncated scripts never execute', async () => {
  const options = setup([{ ...action, stop_reason:'max_tokens' }]);
  await expect(runChatTurn(options)).rejects.toThrow('cut short');
  expect(options.execute).not.toHaveBeenCalled();
});
test('an exhausted action budget produces an actionable error', async () => {
  await expect(runChatTurn({ ...setup([action]), maxRounds:1 })).rejects.toThrow('action limit');
});
test('an empty response is an error', async () => {
  await expect(runChatTurn(setup([{ content:[] }]))).rejects.toThrow('empty response');
});
