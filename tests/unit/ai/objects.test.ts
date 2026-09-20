jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { createObject, paintObject, OBJECT_TYPES } from '../../../implementations/ai.chat/objects';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';
function setup(){const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{} as ICameraController)};}
test.each([...OBJECT_TYPES])('%s creates finite geometry and undoes in one step',type=>{
 const {doc,api}=setup();api.createBox({x:-5,y:0,z:0},1,1,1);
 const result=createObject(api,{type});expect(result.created.faces.length).toBeGreaterThan(5);
 for(const id of result.created.faces){const face=api.getFaceInfo(id)!;expect(face.area).toBeGreaterThan(0);for(const v of face.vertices)expect([v.x,v.y,v.z].every(Number.isFinite)).toBe(true);}
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(6);
 doc.history.redo();expect(api.getAllFaces()).toHaveLength(6+result.created.faces.length);
});
test('glass is hollow with separate transparent water, within requested height',()=>{
 const {doc,api}=setup();const result=createObject(api,{type:'glass_of_water',radius:.04,height:.12});
 expect(api.getBoundingBox().max.y).toBeCloseTo(.12);
 const materials=result.created.faces.map(id=>doc.materials.getFaceMaterial(id));
 expect(materials.some(m=>m.name.startsWith('glass')&&m.opacity===.24)).toBe(true);
 expect(materials.some(m=>m.name.startsWith('water')&&m.opacity===.55)).toBe(true);
 // Every edge has exactly two adjacent faces: glass and water are closed shells.
 const edges=new Map<string,number>();
 for(const id of result.created.faces){const points=api.getFaceInfo(id)!.vertices.map(v=>JSON.stringify(v));points.forEach((a,i)=>{const key=[a,points[(i+1)%points.length]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);});}
 expect([...edges.values()].every(count=>count===2)).toBe(true);
});
test('painting validates all face IDs before touching existing geometry and supports undo',()=>{
 const {doc,api}=setup();const {faceIds}=api.createBox({x:0,y:0,z:0},1,1,1);
 const original=doc.materials.getFaceMaterial(faceIds[0]).id;
 expect(()=>paintObject(api,{faceIds:[faceIds[0],'missing'],color:'red'})).toThrow();
 expect(doc.materials.getFaceMaterial(faceIds[0]).id).toBe(original);
 paintObject(api,{faceIds,color:'blue',material:'glass'});
 expect(doc.materials.getFaceMaterial(faceIds[0])).toMatchObject({opacity:.24,color:{r:56/255,g:122/255,b:204/255}});
 doc.history.undo();expect(doc.materials.getFaceMaterial(faceIds[0]).id).toBe(original);
});
test.each([{radius:NaN},{segments:8.5},{color:'bad'},{material:'missing'},{height:-1},{fill:2}])('invalid inputs are rejected before mutation: %p',extra=>{
 const {api}=setup();expect(()=>createObject(api,{type:'glass_of_water',...extra})).toThrow();expect(api.getAllFaces()).toHaveLength(0);
});

test('colored box tool validates its surface before mutation and preserves single-step undo',async()=>{
 const {executeTool}=await import('../../../implementations/ai.chat/AIService');
 const {api,doc}=setup();
 const failed=JSON.parse(await executeTool(api,'create_box',{width:1,depth:1,height:1,color:'invalid'}));
 expect(failed.ok).toBe(false);expect(api.getAllFaces()).toHaveLength(0);
 const result=JSON.parse(await executeTool(api,'create_box',{width:1,depth:1,height:1,material:'glass',color:'blue'}));
 expect(result.ok).toBe(true);expect(doc.materials.getFaceMaterial(result.created.faces[0]).opacity).toBe(.24);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
