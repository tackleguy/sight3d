import { designReferenceConstraints } from '../../../implementations/ai.chat/architecture-references';
jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { createKnowledgeDesign, wantsKnowledgeDesign } from '../../../implementations/ai.chat/knowledge-design';
import { browserTools, browserRequest, completedBrowserOperations } from '../../../src/web/browser-ai-protocol';
import { getToolDefinitions } from '../../../implementations/ai.chat/AIService';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';
function setup(){const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{} as ICameraController)};}
const plan={name:'Coastal lighthouse',reference:'a typical coastal lighthouse',features:['tall shaft','lantern and roof'],parts:[{name:'shaft',shape:'cylinder',position:[0,5,0],size:[3,10,3],color:'white'},{name:'lantern',shape:'cylinder',position:[0,10.6,0],size:[2,1.2,2],material:'glass'},{name:'roof',shape:'cone',position:[0,12,0],size:[3,1.6,3],color:'red'}]};
test('knowledge-based creation uses an assembly tool without preset context overriding it',()=>{
 const tools=getToolDefinitions(),messages=[{role:'user',content:'Create a lighthouse inspired by a coastal lighthouse.'}];
 expect(browserTools({system:'',tools,messages}).map(t=>t.name)).toEqual(['create_design']);
 const req=browserRequest({system:'',tools,messages});expect(req.messages[0].content).toContain('pretrained general knowledge');expect(req.messages[0].content).not.toContain('Relevant local building recipe');
 expect(req.max_tokens).toBe(3072);expect(wantsKnowledgeDesign('Create a quick soccer stadium preset')).toBe(false);
 expect(wantsKnowledgeDesign('Create a blue cube')).toBe(false);expect(wantsKnowledgeDesign('Create a tower like the Eiffel Tower')).toBe(true);
 expect(browserTools({system:'',tools:[],messages})).toEqual([]);
});
test('multi-part design preserves geometry, center dimensions and materials in one undo step',()=>{
 const {api,doc}=setup();api.createBox({x:20,y:0,z:0},1,1,1);
 const result=createKnowledgeDesign(api,plan);expect(result.parts).toBe(3);expect(result.created.faces.length).toBeGreaterThan(40);
 expect(api.getBoundingBox(result.created.faces).max.y).toBeCloseTo(12.8);
 expect(result.created.faces.some(id=>doc.materials.getFaceMaterial(id).opacity<1)).toBe(true);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(6);doc.history.redo();expect(api.getAllFaces()).toHaveLength(result.created.faces.length+6);
});
test('rotation and ellipsoid scaling respect center coordinates',()=>{
 const {api}=setup();const result=createKnowledgeDesign(api,{...plan,parts:[{name:'sloped beam',shape:'box',position:[0,3,0],size:[6,1,1],rotation:[0,0,90]},{name:'canopy',shape:'sphere',position:[10,5,0],size:[8,2,4]}]});
 const bounds=api.getBoundingBox(result.created.faces);expect(bounds.min.y).toBeCloseTo(0);expect(bounds.max.x).toBeCloseTo(14);expect(bounds.max.y).toBeCloseTo(6);
});
test('invalid later parts reject the entire plan before mutation',()=>{
 const {api}=setup();expect(()=>createKnowledgeDesign(api,{...plan,parts:[plan.parts[0],{...plan.parts[1],size:[1,NaN,1]}]})).toThrow();expect(api.getAllFaces()).toHaveLength(0);
 expect(()=>createKnowledgeDesign(api,{...plan,parts:Array(97).fill(plan.parts[0])})).toThrow();expect(api.getAllFaces()).toHaveLength(0);
});
test('assembly receipts finish once and report approximation rather than a web search',()=>{
 const {api}=setup(),receipt=createKnowledgeDesign(api,plan);
 const response=completedBrowserOperations({system:'',tools:[],messages:[{role:'assistant',content:[{type:'tool_use',id:'design',name:'create_design',input:plan}]},{role:'user',content:[{type:'tool_result',tool_use_id:'design',content:JSON.stringify(receipt)}]}]});
 expect(response?.content?.[0].text).toContain('not a retrieved image');expect(response?.stop_reason).toBe('end_turn');
});

test('invalid AI assemblies get one corrective attempt before any geometry is exposed',async()=>{
 const {generateBrowserResponse}=await import('../../../src/web/browser-ai-protocol');
 const correctedPlan={...plan,referenceIds:designReferenceConstraints('Create a coastal lighthouse').references.slice(0,1)};
 const generate=jest.fn().mockResolvedValueOnce({choices:[{message:{content:JSON.stringify({reply:'',calls:[{name:'create_design',arguments:{...plan,reference:''}}]})},finish_reason:'stop'}]}).mockResolvedValueOnce({choices:[{message:{content:JSON.stringify({reply:'',calls:[{name:'create_design',arguments:correctedPlan}]})},finish_reason:'stop'}]});
 const response=await generateBrowserResponse({system:'',tools:getToolDefinitions(),messages:[{role:'user',content:'Create a coastal lighthouse'}]},generate);
 expect(generate).toHaveBeenCalledTimes(2);expect(generate.mock.calls[1][0].messages[0].content).toContain('reference must contain');expect(response.content?.[0].input?.reference).toBe(plan.reference);
});
