jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { BUILDING_ARCHETYPES, BUILDING_RECIPE_COUNT, DESIGN_STYLES, MASSING_FORMS, buildingRecipe, findBuildingArchetype, resolveBuildingRecipe, searchBuildingCatalog, buildingCatalogContext, type DesignStyle, type MassingForm } from '../../../implementations/ai.chat/building-catalog';
import { buildingOptions, buildingMesh, createBuilding, createCity, detailBuilding } from '../../../implementations/ai.chat/architecture';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';
function setup(){const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{} as ICameraController)};}
test('catalog has unique subtypes and addressable recipes',()=>{
 expect(BUILDING_ARCHETYPES.length).toBeGreaterThan(100);expect(new Set(BUILDING_ARCHETYPES.map(a=>a.id)).size).toBe(BUILDING_ARCHETYPES.length);
 expect(new Set(BUILDING_ARCHETYPES.map(a=>a.category)).size).toBeGreaterThan(50);expect(BUILDING_RECIPE_COUNT).toBe(BUILDING_ARCHETYPES.length*100);
 const ids=new Set<string>();
 for(const a of BUILDING_ARCHETYPES)for(const style of Object.keys(DESIGN_STYLES))for(const form of Object.keys(MASSING_FORMS)){
  const recipe=buildingRecipe(a.id,style as DesignStyle,form as MassingForm);ids.add(recipe.id);
  const o=buildingOptions({catalogId:recipe.id,detail:2}),mesh=buildingMesh(o);
  expect(mesh.faces.length).toBeGreaterThan(10);expect(mesh.faces.length).toBeLessThanOrEqual(16000);
  if(!mesh.vertices.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z)))throw new Error(`Nonfinite vertex: ${recipe.id}`);
  if(!mesh.faces.every(f=>f.length>=3&&f.every(i=>i>=0&&i<mesh.vertices.length)))throw new Error(`Invalid face: ${recipe.id}`);
  for(const face of mesh.faces){const [a,b,c]=face.map(i=>mesh.vertices[i]);const u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},v={x:c.x-a.x,y:c.y-a.y,z:c.z-a.z};
   if(Math.hypot(u.y*v.z-u.z*v.y,u.z*v.x-u.x*v.z,u.x*v.y-u.y*v.x)<1e-12)throw new Error(`Degenerate face: ${recipe.id}`);
  }
 }
 expect(ids.size).toBe(BUILDING_RECIPE_COUNT);
},180000);
test.each([['Create an airport terminal','airport_terminal'],['Make a dental clinic','dental_clinic'],['Build a train station','railway_station'],['Make an art museum','art_museum'],['Create a courthouse','courthouse']])('specific subtype retrieval: %s',(text,id)=>{
 expect(findBuildingArchetype(text)?.id).toBe(id);expect(buildingCatalogContext(text)).toContain(id);
});
test('catalog dimensions, style and features survive model guesses, but explicit dimensions win',()=>{
 const o=buildingOptions({type:'skyscraper',floors:48,width:99,height:180,brief:'Create a terraced brutalist art museum, 48m wide, 30m deep and 20m tall.'});
 expect(o).toMatchObject({catalogId:'art_museum/brutalist/terraced',type:'civic',height:20,width:48,depth:30,style:'concrete',feature:'skylights',designStyle:'brutalist'});
 expect(o.sections).toHaveLength(6);
 expect(buildingOptions({catalogId:'bungalow',brief:'Build a bungalow with 3 floors'}).height).toBeCloseTo(10.2);
 expect(buildingOptions({type:'airport terminal'}).catalogId).toBe('airport_terminal/contemporary/compact');
});
test('unknown IDs reject before mutation; search is paginated and readonly',()=>{
 const {api}=setup();expect(()=>createBuilding(api,{catalogId:'invented'})).toThrow('Unknown');expect(api.getAllFaces()).toHaveLength(0);
 const first=searchBuildingCatalog({limit:20}),second=searchBuildingCatalog({limit:20,offset:20});
 expect(first.matchCount).toBe(BUILDING_ARCHETYPES.length);expect(first.nextOffset).toBe(20);
 expect(new Set([...first.results,...second.results].map(r=>r.id)).size).toBe(40);
 expect(searchBuildingCatalog({query:'dental clinic'}).results[0].id).toBe('dental_clinic');
 expect(searchBuildingCatalog({query:'xyzunknown'}).results).toHaveLength(0);
 expect(()=>resolveBuildingRecipe({catalogId:'bungalow/unknown/compact'})).toThrow();
});
test.each(['aircraft_hangar','church','railway_station','art_museum','general_hospital','greenhouse','residential_tower'])('%s imports with features and one-step undo; refinement adds no duplicate faces',id=>{
 const {api,doc}=setup();const initial=createBuilding(api,{catalogId:id,detail:1});
 const base=api.getAllFaces().length;expect(initial.catalogId).toContain(id);
 detailBuilding(api);detailBuilding(api);
 const expected=buildingMesh(buildingOptions({catalogId:id,detail:3})).faces.length;
 expect(api.getAllFaces()).toHaveLength(expected);
 doc.history.undo();doc.history.undo();expect(api.getAllFaces()).toHaveLength(base);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
 doc.history.redo();expect(api.getAllFaces()).toHaveLength(base);
});
test('subtype features produce different silhouettes and style changes affect facade geometry',()=>{
 const hangar=buildingMesh(buildingOptions({catalogId:'aircraft_hangar',detail:3}));
 const church=buildingMesh(buildingOptions({catalogId:'church',detail:3}));
 expect(hangar.vertices).not.toEqual(church.vertices);
 const a=buildingMesh(buildingOptions({catalogId:'art_museum/industrial/compact',detail:3}));
 const b=buildingMesh(buildingOptions({catalogId:'art_museum/minimalist/compact',detail:3}));
 expect(a.vertices).not.toEqual(b.vertices);
});


test('catalog city blocks honor the requested subtype and remain one undo step',()=>{
 const {api,doc}=setup();
 const result=createCity(api,{count:3,seed:7,brief:'Create a neighborhood of cottages',detail:2});
 expect(result.summary).toContain('cottage');expect(api.getBoundingBox().max.y).toBeLessThan(10);
 expect(api.getAllFaces().length).toBeGreaterThan(100);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
