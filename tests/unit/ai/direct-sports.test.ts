jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { directSportsRequest, createDirectSportsResponder } from '../../../implementations/ai.chat/direct-sports';
import { runChatTurn } from '../../../implementations/ai.chat/chat-runner';
import { executeTool } from '../../../implementations/ai.chat/AIService';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';

test.each(['Create a stadium','stadium','Can you make a soccer stadium?','Create a basketball arena with an open roof.','Build a stadium for baseball.'])('direct venue request: %s',text=>expect(directSportsRequest(text)).toBe(true));
test.each(['How do I build a stadium?','Do not create a stadium','Move the stadium','Create two stadiums','Create a stadium and a house','Create a stadium with 50000 seats','Create a stadium next to the house','What is a stadium?','Describe a stadium','Is this a stadium'])('does not shortcut unsupported or non-creation request: %s',text=>expect(directSportsRequest(text)).toBe(false));
test.each(['Create a soccer stadium 200m wide and 140m deep.','Create a basketball arena with an open roof.'])('runs the real tool without AI and supports undo: %s',async text=>{
 const doc=new ModelDocument(new GeometryEngine()),api=new ModelAPI(doc,()=>{},{} as ICameraController);
 const respond=createDirectSportsResponder(text),execute=jest.fn((name,input)=>executeTool(api,name,input));
 const result=await runChatTurn({messages:[{role:'user',content:text}],request:async messages=>respond(messages),execute,stopped:()=>false,onProgress:()=>{},onTool:()=>{},allowEdits:true});
 expect(execute).toHaveBeenCalledTimes(1);expect(api.getAllFaces().length).toBeGreaterThan(50);expect(result.text).toContain('open roof');
 if(text.includes('200m'))expect(api.getBoundingBox().max.x-api.getBoundingBox().min.x).toBeCloseTo(200);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
test('failed tool receipts do not become success messages',()=>{
 const respond=createDirectSportsResponder('Create a stadium');respond([]);
 expect(respond([{role:'user',content:[{type:'tool_result',tool_use_id:'direct-sports-build',content:JSON.stringify({ok:false,error:'Invalid width'})}]}]).error).toBe('Invalid width');
});
