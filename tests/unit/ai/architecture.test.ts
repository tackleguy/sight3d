jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { buildingOptions, buildingMesh, architectureBrief, createBuilding, createCity, detailBuilding } from '../../../implementations/ai.chat/architecture';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';
function setup(){const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{} as ICameraController)};}

test.each(['rectangle','circle','ellipse','triangle','hexagon','l_shape','u_shape'])('%s buildings import completely and respect requested height',shape=>{
 const {api,doc}=setup();
 const options=buildingOptions({shape,floors:4,width:24,depth:18,height:20,detail:3,twist:30,taper:.2});
 const mesh=buildingMesh(options),result=createBuilding(api,options);
 expect(result.created.faces).toHaveLength(mesh.faces.length);
 expect(api.getBoundingBox().max.y-api.getBoundingBox().min.y).toBeCloseTo(20);
 expect(api.getAllFaces().length).toBeGreaterThan(50);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
 doc.history.redo();expect(api.getAllFaces()).toHaveLength(mesh.faces.length);
});
test.each(['flat','gable','hip','dome','pyramid','spire'])('%s roof is valid and included in total height',roof=>{
 const {api}=setup();createBuilding(api,{type:'house',roof,height:8});expect(api.getBoundingBox().max.y).toBeCloseTo(8);
});
test('round, L-shaped and custom lofts have different geometry',()=>{
 const round=buildingMesh(buildingOptions({shape:'circle'}));
 const l=buildingMesh(buildingOptions({shape:'l_shape'}));expect(round.faces.length).not.toBe(l.faces.length);
 const {api}=setup();createBuilding(api,{shape:'custom',roof:'flat',height:50,footprint:[{x:0,z:0},{x:20,z:0},{x:24,z:10},{x:12,z:18},{x:0,z:10}],sections:[{at:0},{at:.5,scale:.8,rotation:30,offsetX:5},{at:1,scale:.5,rotation:60,offsetX:10}]});
 expect(api.getBoundingBox().max.y).toBeCloseTo(50);
});
test('explicit prompt dimensions and shape override model guesses',()=>{
 const o=buildingOptions({shape:'rectangle',height:180,floors:48,brief:'Create a 2-floor circular house, 12m wide, 10m deep, 8m tall with a dome roof.'});
 expect(o).toMatchObject({type:'house',shape:'circle',roof:'dome',height:8,width:12,depth:10,floors:2});
 expect(architectureBrief('A twisted tower 100 feet tall')).toMatchObject({height:30.48,twist:60});
});
test('details add to the existing building and are undoable',()=>{
 const {doc,api}=setup();createBuilding(api,{type:'house',detail:1});const base=api.getAllFaces().length;
 detailBuilding(api);const windows=api.getAllFaces().length;expect(windows).toBeGreaterThan(base);
 detailBuilding(api);expect(api.getAllFaces().length).toBeGreaterThan(windows);
 doc.history.undo();expect(api.getAllFaces().length).toBe(windows);
 detailBuilding(api);expect(()=>detailBuilding(api)).toThrow('level 3');
});
test('city blocks vary by city and preserve unrelated geometry with single-step undo',()=>{
 const {doc,api}=setup();api.createBox({x:-30,y:0,z:0},1,1,1);
 const result=createCity(api,{city:'Paris',count:4,seed:3});expect(result.summary).toContain('Paris');
 const paris=api.getBoundingBox().max.y;doc.history.undo();expect(api.getAllFaces()).toHaveLength(6);
 createCity(api,{city:'Dubai',count:4,seed:3});expect(api.getBoundingBox().max.y).toBeGreaterThan(paris*3);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(6);
});
test('invalid footprints and excessive inputs do not mutate the document',()=>{
 const {api}=setup();
 expect(()=>createBuilding(api,{shape:'custom',footprint:[{x:0,z:0},{x:10,z:10},{x:0,z:10},{x:10,z:0}]})).toThrow('cross');
 expect(()=>createBuilding(api,{height:Infinity})).toThrow();
 expect(()=>createCity(api,{count:999})).toThrow();
 expect(api.getAllFaces()).toHaveLength(0);
});

test('unrequested model embellishments are removed and floors follow total height',()=>{
 const o=buildingOptions({type:'office',height:100,twist:60,taper:.85,city:'Dubai',floors:3,x:99,brief:'Create an office 100m tall.'});
 expect(o).toMatchObject({height:100,floors:29,twist:0,taper:0,city:'',x:0});
});
test.each(['London','Barcelona','Hong Kong','San Francisco','Venice','Sydney'])('%s produces a valid city block',city=>{
 const {api}=setup();expect(createCity(api,{city,count:2,seed:4}).summary).toContain(city);
});
