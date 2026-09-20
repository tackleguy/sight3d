import { browserRequest, parseBrowserReply, completedBrowserOperations, browserTools } from '../../../src/web/browser-ai-protocol';
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
