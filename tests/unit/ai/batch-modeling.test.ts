jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import {createBatch,directBatchPlan,validateBatch,createBatchResponder} from '../../../implementations/ai.chat/batch-modeling';
import {runChatTurn} from '../../../implementations/ai.chat/chat-runner';
import {ModelAPI} from '../../../implementations/api.model/ModelAPI';
import {ModelDocument} from '../../../implementations/data.document/ModelDocument';
import {GeometryEngine} from '../../../implementations/engine.geometry/GeometryEngine';
import type {ICameraController} from '../../../src/core/interfaces';
const setup=()=>{const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{} as ICameraController)};};
const yieldControl=async()=>{};
test('15 natural-language commands create exactly 150 separate objects, preserve existing geometry, and undo individually',async()=>{
 const {doc,api}=setup();api.createBox({x:-50,y:0,z:0},1,1,1);
 const prompt=Array.from({length:15},(_,i)=>`${i+1}. Create 10 ${i%3===0?'red cubes':i%3===1?'blue spheres':'chairs'}.`).join('\n');
 const plan=directBatchPlan(prompt)!;expect(plan.commands).toHaveLength(15);expect(validateBatch(plan as any).total).toBe(150);
 const result=await createBatch(api,plan as any,{yieldControl});
 expect(result).toMatchObject({ok:true,completed:150,total:150,commands:15});
 expect(result.created.faces).toHaveLength(50*(6+128+36));
 expect(api.getAllFaces()).toHaveLength(result.created.faces.length+6);
 for(let i=0;i<150;i++)doc.history.undo();expect(api.getAllFaces()).toHaveLength(6);
 doc.history.redo();expect(api.getAllFaces()).toHaveLength(12);
},30000);
test('150 houses fit within the geometric budget without an AI output per house',async()=>{
 const {api}=setup();const plan=directBatchPlan('Create 150 houses.')!;
 const result=await createBatch(api,plan as any,{yieldControl});
 expect(result).toMatchObject({ok:true,completed:150});expect(result.created.faces.length).toBeGreaterThan(150*6);
},30000);
test('cancellation retains exactly the completed objects and yields between them',async()=>{
 const {api}=setup();let calls=0;const progress:string[]=[];
 const result=await createBatch(api,{commands:[{kind:'box',count:150,parameters:{}}]},{yieldControl:async()=>{calls++;},stopped:()=>calls>7,onProgress:s=>progress.push(s)});
 expect(result).toMatchObject({stopped:true,completed:7,total:150});expect(api.getAllFaces()).toHaveLength(42);expect(progress).toHaveLength(7);
});
test('an invalid last command prevents all mutations',async()=>{
 const {api}=setup();await expect(createBatch(api,{commands:[{kind:'box',count:10,parameters:{}},{kind:'object',count:10,parameters:{type:'chair',height:-1}}]})).rejects.toThrow('height');
 expect(api.getAllFaces()).toHaveLength(0);
 expect(()=>validateBatch({commands:[{kind:'box',count:151,parameters:{}}]})).toThrow('150');
});
test('a failed object preserves completed work and reports the partial count without replay',async()=>{
 const {api}=setup();const original=api.createBox.bind(api);let calls=0;
 jest.spyOn(api,'createBox').mockImplementation((...args)=>{if(++calls===4)throw new Error('Simulated failure');return original(...args);});
 const result=await createBatch(api,{commands:[{kind:'box',count:10,parameters:{}}]},{yieldControl});
 expect(result).toMatchObject({ok:false,completed:3,error:'Simulated failure'});expect(api.getAllFaces()).toHaveLength(18);
});
test('batch shortcut preserves dimensions and leaves unsupported requests to the AI',()=>{
 expect(directBatchPlan('Create 10 cubes, 50 blue spheres, and 90 chairs.')?.commands.map(c=>c.count)).toEqual([10,50,90]);
 expect(directBatchPlan('Create 10 boxes 3.5m wide 2m deep 1m tall.')?.commands[0].parameters).toMatchObject({width:3.5,depth:2,height:1});
 for(const text of ['Do not create 150 cubes','Move 150 existing houses','Create 20 chairs with curved legs','Create a house'])expect(directBatchPlan(text)).toBeNull();
});
test('the turn loop executes a batch once and finishes from the receipt',async()=>{
 const {api}=setup(),plan=directBatchPlan('Create 150 cubes.')!,respond=createBatchResponder(plan),request=jest.fn(async(messages:any[])=>respond(messages));
 const execute=jest.fn(async(_:string,p:Record<string,unknown>)=>JSON.stringify(await createBatch(api,p,{yieldControl})));
 const result=await runChatTurn({messages:[{role:'user',content:'Create 150 cubes.'}],request,execute,stopped:()=>false,onProgress:()=>{},onTool:()=>{},allowEdits:true});
 expect(execute).toHaveBeenCalledTimes(1);expect(result.text).toContain('150 of 150');expect(api.getAllFaces()).toHaveLength(900);
});
