import { browserRequest, parseBrowserReply } from '../../../src/web/browser-ai-protocol';
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
 expect(schema.properties.calls.items.properties.name.enum).toEqual(['create_box']);
});

test('only shows confirmation after the tool result has been processed',()=>{
 const result=parseBrowserReply(JSON.stringify({reply:'Created a cube.',calls:[{name:'create_box',arguments:'{"width":1,"depth":1,"height":1}'}]}),tools,'stop');
 expect(result.content?.map(block=>block.type)).toEqual(['tool_use']);
});
