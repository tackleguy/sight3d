import { browserRequest, parseBrowserReply, completedBrowserOperations, browserTools, generateBrowserResponse } from '../../../src/web/browser-ai-protocol';
const tools=[{name:'create_box',description:'Create a box',input_schema:{type:'object'}}];
test('browser Build plans adapt to the existing tool loop',()=>{
 const result=parseBrowserReply(JSON.stringify({reply:'',calls:[{name:'create_box',arguments:JSON.stringify({width:1,depth:2,height:3})}]}),tools,'stop');
 expect(result.stop_reason).toBe('tool_use');
 expect(result.content?.[0]).toMatchObject({name:'create_box',input:{width:1,depth:2,height:3}});
});
test('browser Learn uses plain text without exposing tools',()=>{
 const request=browserRequest({system:'Teach',messages:[{role:'user',content:'How do I draw?'}],tools:[]});
 expect(request.response_format).toBeUndefined();
 expect(parseBrowserReply('Use Rectangle.',[],'stop').content?.[0].text).toBe('Use Rectangle.');
});
test('rejects unavailable tools, malformed inputs and truncated plans before execution',()=>{
 for(const calls of [[{name:'delete_everything',arguments:'{}'}],[{name:'create_box',arguments:'oops'}],[{name:'create_box',arguments:'[]'}]]) expect(()=>parseBrowserReply(JSON.stringify({reply:'',calls}),tools,'stop')).toThrow();
 expect(()=>parseBrowserReply('{',tools,'length')).toThrow('response limit');
});
test('bounds the number of mutations in one response',()=>{
 expect(()=>parseBrowserReply(JSON.stringify({reply:'',calls:Array(7).fill({name:'create_box',arguments:'{}'})}),tools,'stop')).toThrow('invalid plan');
});
test('the response schema only advertises permitted tool names',()=>{
 const request=browserRequest({system:'Build',messages:[],tools});
 const schema=JSON.parse(request.response_format!.schema);
 expect(schema.properties.calls.items.anyOf.map((branch:any)=>branch.properties.name.const)).toEqual(['create_box']);
});

test('only shows confirmation after the tool result has been processed',()=>{
 const result=parseBrowserReply(JSON.stringify({reply:'Created a cube.',calls:[{name:'create_box',arguments:'{"width":1,"depth":1,"height":1}'}]}),tools,'stop');
 expect(result.content?.map(block=>block.type)).toEqual(['tool_use']);
});

test('successful box receipts end the plan without repeating geometry',()=>{
 const receipt={type:'tool_result',tool_use_id:'box',content:JSON.stringify({ok:true,created:{faces:['a','b','c','d','e','f']}})};
 const messages=[{role:'assistant',content:[{type:'tool_use',id:'box',name:'create_box',input:{width:2,depth:3,height:4}}]}, {role:'user',content:[receipt]}];
 const result=completedBrowserOperations({system:'',tools,messages});
 expect(result?.stop_reason).toBe('end_turn');
 expect(result?.content?.[0].text).toContain('2 × 3 × 4 m');
 receipt.content=JSON.stringify({ok:false,error:'Invalid dimensions'});
 expect(completedBrowserOperations({system:'',tools,messages})?.error).toContain('Invalid dimensions');
});
test('unmatched results never claim a completed box',()=>{
 expect(completedBrowserOperations({system:'',tools,messages:[{role:'user',content:'Create a box'}]})).toBeNull();
});

test('browser skyscraper arguments use schema-constrained objects without JSON string escaping',()=>{
 const result=parseBrowserReply(JSON.stringify({reply:'',calls:[{name:'create_skyscraper',arguments:{floors:48,detail:2}}]}),[{name:'create_skyscraper'}],'stop');
 expect(result.content?.[0].input).toEqual({floors:48,detail:2});
});

test('an explicit tower detail level is enforced by the generation schema',()=>{
 const request=browserRequest({system:'',messages:[{role:'user',content:'48 floors, 3 setbacks, detail level 2'}],tools:[{name:'create_skyscraper',input_schema:{type:'object',properties:{detail:{type:'integer'}}}}]});
 const branch=JSON.parse(request.response_format!.schema).properties.calls.items.anyOf[0];
 expect(branch.properties.arguments.properties.detail.const).toBe(2);
 expect(branch.properties.arguments.required).toContain('detail');
});

test('architectural requests constrain the tiny model to the appropriate procedural tool',()=>{
 const tools=[{name:'create_skyscraper'},{name:'detail_skyscraper'},{name:'execute_script'}];
 const messages=[{role:'user',content:'Build a 50-floor skyscraper'}];
 expect(browserTools({system:'',tools,messages}).map(t=>t.name)).toEqual(['create_skyscraper']);
 messages.push({role:'assistant',content:'Created a skyscraper.'},{role:'user',content:'Add more detail'});
 expect(browserTools({system:'',tools,messages}).map(t=>t.name)).toEqual(['detail_skyscraper']);
 expect(browserTools({system:'',tools:[],messages})).toEqual([]);
 messages.push({role:'user',content:'Move the tower ten meters east'});
 expect(browserTools({system:'',tools,messages})).toHaveLength(3);
});

test('procedural tower receipt completes without another generation',()=>{
 const result=completedBrowserOperations({system:'',tools:[],messages:[{role:'assistant',content:[{type:'tool_use',id:'tower',name:'create_skyscraper',input:{}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'tower',content:JSON.stringify({ok:true,created:{faces:['face']},summary:'Created a 48-floor tower.'})}]}]});
 expect(result?.content?.[0].text).toBe('Created a 48-floor tower.');
 expect(result?.stop_reason).toBe('end_turn');
});

test('architecture routing distinguishes individual buildings, blocks and detail',()=>{
 const tools=['create_building','create_city','detail_building','execute_script'].map(name=>({name,input_schema:{type:'object'}}));
 for(const [prompt,name] of [['Create a circular office inspired by New York city','create_building'],['Generate a Paris neighborhood with 4 buildings','create_city'],['Make 6 London buildings','create_city']]){
  const request=browserRequest({system:'',tools,messages:[{role:'user',content:prompt}]});
  const schema=JSON.parse(request.response_format!.schema);
  expect(schema.properties.calls.maxItems).toBe(1);
  expect(schema.properties.calls.items.anyOf[0].properties.name.const).toBe(name);
 }
 expect(browserTools({system:'',tools,messages:[{role:'assistant',content:'Created a house.'},{role:'user',content:'Add more detail.'}]}).map(t=>t.name)).toEqual(['detail_building']);
});

test('truncated plans retry before any executable calls are returned',async()=>{
 const generate=jest.fn().mockResolvedValueOnce({choices:[{message:{content:'{"reply":"","calls":['},finish_reason:'length'}]})
  .mockResolvedValueOnce({choices:[{message:{content:JSON.stringify({reply:'',calls:[{name:'create_box',arguments:{width:2,depth:3,height:4}}]})},finish_reason:'stop'}]});
 const result=await generateBrowserResponse({system:'',tools,messages:[]},generate);
 expect(generate).toHaveBeenCalledTimes(2);
 expect(generate.mock.calls[1][0].max_tokens).toBeGreaterThan(generate.mock.calls[0][0].max_tokens);
 expect(result.content).toHaveLength(1);
 expect(result.content?.[0]).toMatchObject({name:'create_box',input:{width:2,depth:3,height:4}});
});
test('recovery is bounded and cancellation never starts another generation',async()=>{
 const args={system:'',tools,messages:[]};
 const generate=jest.fn().mockResolvedValue({choices:[{message:{content:'{'},finish_reason:'length'}]});
 await expect(generateBrowserResponse(args,generate)).rejects.toThrow('response limit');
 expect(generate).toHaveBeenCalledTimes(2);
 generate.mockClear();
 await expect(generateBrowserResponse(args,generate,()=>true)).rejects.toThrow('stopped');
 expect(generate).not.toHaveBeenCalled();
 let stopped=false;
 const cancelled=jest.fn(async()=>{stopped=true;return {choices:[{message:{content:'{'},finish_reason:'length'}]};});
 await expect(generateBrowserResponse(args,cancelled,()=>stopped)).rejects.toThrow('stopped');
 expect(cancelled).toHaveBeenCalledTimes(1);
});
test('long chat history is bounded while preserving the latest request',()=>{
 const messages=Array.from({length:10},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(8000)}));
 messages.push({role:'user',content:'Create a round office 100m tall'});
 const request=browserRequest({system:'',tools,messages});
 expect(request.messages.slice(1).reduce((n,m)=>n+m.content.length,0)).toBeLessThanOrEqual(6000);
 expect(request.messages[request.messages.length-1]?.content).toBe('Create a round office 100m tall');
});
test('architecture grammar reserves output for a single plan rather than long explanations',()=>{
 const request=browserRequest({system:'',messages:[{role:'user',content:'Create a house'}],tools:[{name:'create_building',input_schema:{type:'object'}}]});
 const schema=JSON.parse(request.response_format!.schema);
 expect(schema.properties.reply).toEqual({const:''});
 expect(schema.properties.calls.minItems).toBe(1);
 expect(request.max_tokens).toBe(2048);
});


test('object prompts use direct tools and receipts prevent duplicate objects',()=>{
 const tools=[{name:'create_object'},{name:'create_building'},{name:'execute_script'}];
 expect(browserTools({system:'',tools,messages:[{role:'user',content:'Create a glass of water'}]}).map(t=>t.name)).toEqual(['create_object']);
 const messages=[{role:'assistant',content:[{type:'tool_use',id:'glass',name:'create_object',input:{type:'glass_of_water'}}]}, {role:'user',content:[{type:'tool_result',tool_use_id:'glass',content:JSON.stringify({ok:true,created:{faces:['a']},summary:'Created glass of water.'})}]}];
 expect(completedBrowserOperations({system:'',tools,messages})?.content?.[0].text).toBe('Created glass of water.');
});


test('catalog subtypes route to architecture while catalog browsing stays read-only',()=>{
 const tools=[{name:'create_building',input_schema:{type:'object'}},{name:'create_object',input_schema:{type:'object'}},{name:'search_building_catalog',input_schema:{type:'object'}},{name:'create_city',input_schema:{type:'object'}}];
 expect(browserTools({system:'',tools,messages:[{role:'user',content:'Build an airport terminal'}]}).map(t=>t.name)).toEqual(['create_building']);
 expect(browserTools({system:'',tools,messages:[{role:'user',content:'Create a clinic with a chair'}]}).map(t=>t.name)).toEqual(['create_building']);
 expect(browserTools({system:'',tools,messages:[{role:'user',content:'Show me types of buildings in the catalog'}]}).map(t=>t.name)).toEqual(['search_building_catalog']);
 expect(browserTools({system:'',tools,messages:[{role:'user',content:'Make a neighborhood of cottages'}]}).map(t=>t.name)).toEqual(['create_city']);
 const request=browserRequest({system:'',tools,messages:[{role:'user',content:'Create a terraced brutalist art museum'}]});
 expect(request.messages[0].content).toContain('art_museum/brutalist/terraced');
 expect(request.messages[0].content.length).toBeLessThan(4000);
});
test('catalog receipt answers without a second generation or geometry claims',()=>{
 const result={recipeCount:10000,subtypeCount:100,results:[{id:'cottage',name:'cottage',category:'Detached homes',dimensions:{width:10,depth:8,height:6},feature:'chimney'}],nextOffset:null};
 const response=completedBrowserOperations({system:'',tools:[],messages:[{role:'assistant',content:[{type:'tool_use',id:'search',name:'search_building_catalog',input:{}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'search',content:JSON.stringify(result)}]}]});
 expect(response?.content?.[0].text).toContain('10,000 configurable');expect(response?.content?.[0].text).toContain('cottage');
});

test('stadiums and arenas route to building creation and detail tools',()=>{
 const tools=[{name:'create_building'},{name:'detail_building'},{name:'create_city'}];
 for(const content of ['Create a soccer stadium','Build a basketball arena','Build a custom sport stadium'])expect(browserTools({system:'',tools,messages:[{role:'user',content}]}).map(t=>t.name)).toEqual(['create_building']);
 expect(browserTools({system:'',tools,messages:[{role:'assistant',content:'Created a soccer stadium.'},{role:'user',content:'Add more detail.'}]}).map(t=>t.name)).toEqual(['detail_building']);
});
