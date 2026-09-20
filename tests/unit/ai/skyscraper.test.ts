jest.mock('../../../implementations/data.materials/ProceduralTextures', () => ({ generateBuiltinMaterials: () => [] }));
import { skyscraperOptions, skyscraperMesh, buildSkyscraper } from '../../../implementations/ai.chat/skyscraper';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';

function setup(){const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{ } as ICameraController)};}
test('detail layers contain finite geometry and bounded face counts at maximum size',()=>{
 const o=skyscraperOptions({floors:100,width:100,depth:100,setbacks:5,detail:3});
 let count=0;
 for(let level=1;level<=3;level++){
  const mesh=skyscraperMesh(o,level);count+=mesh.faces.length;
  expect(mesh.faces.length).toBeGreaterThan(20);
  expect(mesh.faces.length).toBe(mesh.colors.length);
  expect(mesh.vertices.every(v=>[v.x,v.y,v.z].every(Number.isFinite))).toBe(true);
  expect(mesh.faces.every(f=>f.every(i=>i>=0&&i<mesh.vertices.length))).toBe(true);
 }
 expect(count).toBeLessThan(8000);
});
test('detailed tower and added detail each undo and redo as one operation',()=>{
 const {doc,api}=setup();
 const result=buildSkyscraper(api,{floors:12,detail:2});
 const before=api.getAllFaces().length;
 expect(before).toBeGreaterThan(200);
 expect(result.summary).toContain('12-floor');
 expect(api.getBoundingBox().max.y).toBeCloseTo(72);
 buildSkyscraper(api,{},true);
 const detailed=api.getAllFaces().length;expect(detailed).toBeGreaterThan(before);
 expect(()=>buildSkyscraper(api,{},true)).toThrow('maximum detail');
 doc.history.undo();expect(api.getAllFaces().length).toBe(before);
 doc.history.redo();expect(api.getAllFaces().length).toBe(detailed);
 doc.history.undo();buildSkyscraper(api,{},true);expect(api.getAllFaces().length).toBe(detailed);
 doc.history.undo();doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
test('rejects invalid inputs and missing or changed towers without edits',()=>{
 const {api}=setup();
 for(const input of [{floors:10000},{width:NaN},{detail:4},{style:'invalid'}])expect(()=>buildSkyscraper(api,input)).toThrow();
 expect(api.getAllFaces()).toHaveLength(0);
 expect(()=>buildSkyscraper(api,{},true)).toThrow('Create a skyscraper first');
 buildSkyscraper(api,{floors:8,detail:1});
 api.moveEntities(api.getAllFaces(),{x:10,y:0,z:0});
 const count=api.getAllFaces().length;
 expect(()=>buildSkyscraper(api,{},true)).toThrow('moved');expect(api.getAllFaces()).toHaveLength(count);
});

test('adding a tower preserves unrelated geometry even after prior imported geometry was deleted',()=>{
 const {api}=setup();
 const vertices=[{x:200,y:0,z:0},{x:201,y:0,z:0},{x:200,y:1,z:0}];
 const first=api.importGeometry(vertices,[[0,1,2]]);
 const second=api.importGeometry(vertices.map(v=>({...v,z:10})),[[0,1,2]]);
 const preserved=api.getFaceInfo(second.faceIds[0]);
 api.deleteEntities(first.faceIds);
 buildSkyscraper(api,{floors:8,detail:1});
 expect(api.getFaceInfo(second.faceIds[0])).toEqual(preserved);
});
