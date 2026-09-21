jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { BUILDING_ARCHETYPES, BUILDING_CATEGORIES, BUILDING_RECIPE_COUNT, findBuildingArchetype, resolveBuildingRecipe, searchBuildingCatalog, inferBuildingUse, buildingCatalogContext } from '../../../implementations/ai.chat/building-catalog';
import { buildingOptions, buildingMesh, createBuilding, detailBuilding } from '../../../implementations/ai.chat/architecture';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';
function setup(){const doc=new ModelDocument(new GeometryEngine());return {doc,api:new ModelAPI(doc,()=>{},{} as ICameraController)};}
test('coverage spans hundreds of named uses with honest family-level attribution',()=>{
 expect(BUILDING_ARCHETYPES.length).toBeGreaterThan(600);expect(BUILDING_CATEGORIES.length).toBeGreaterThan(50);
 expect(BUILDING_RECIPE_COUNT).toBe(BUILDING_ARCHETYPES.length*100);
 console.log(`Catalog coverage: ${BUILDING_ARCHETYPES.length} subtypes, ${BUILDING_CATEGORIES.length} categories, ${BUILDING_RECIPE_COUNT} recipes`);
 expect(resolveBuildingRecipe({type:'semiconductor fabrication plant'})?.approximation).toContain('Family-level');
 expect(resolveBuildingRecipe({buildingUse:'cathedral'})?.id).toBe('cathedral/contemporary/compact');
 expect(searchBuildingCatalog({query:'pharmacy'}).results[0]).toMatchObject({id:'pharmacy',coverage:'family'});
 expect(searchBuildingCatalog({query:'art'}).results.some(r=>r.name.includes('apartment'))).toBe(false);
});
test.each(['cathedral','hospice','semiconductor fabrication plant','parliament building','water pumping station','Buddhist temple','shophouse','capsule hotel','postal sorting office','electric vehicle charging station building'])('recognizes %s and builds editable geometry',name=>{
 const recipe=resolveBuildingRecipe({type:name})!;expect(recipe).toBeDefined();
 const {api,doc}=setup();const result=createBuilding(api,{type:name,detail:2});
 expect(result.created.faces.length).toBeGreaterThan(10);expect(result.summary).toContain('Family-level');
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
test('plural names, accents, centre spelling and aliases retrieve the intended uses',()=>{
 expect(findBuildingArchetype('Build churches')?.id).toBe('church');
 expect(findBuildingArchetype('Create public libraries')?.id).toBe('public_library');
 expect(findBuildingArchetype('Create a wellness centre')?.id).toBe('wellness_center');
 expect(findBuildingArchetype('Create a café')?.id).toBe('cafe');
 expect(findBuildingArchetype('Create a petrol station')?.id).toBe('fuel_station');
});
test('unknown use is explicitly approximated, dimensioned, and undoable',()=>{
 const {api,doc}=setup();const input={buildingUse:'quantum archives facility',baseType:'civic',width:42,depth:24,height:16,features:['canopy','skylights'],detail:1};
 const options=buildingOptions(input);expect(options).toMatchObject({width:42,height:16,features:['canopy','skylights']});
 const result=createBuilding(api,input);expect(result.approximation).toContain('No dedicated recipe');expect(result.summary).toContain('quantum archives facility');
 const base=api.getAllFaces().length;detailBuilding(api);detailBuilding(api);
 expect(api.getAllFaces()).toHaveLength(buildingMesh({...options,detail:3}).faces.length);
 doc.history.undo();doc.history.undo();expect(api.getAllFaces()).toHaveLength(base);doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
test('natural-language custom routing avoids arbitrary objects and preserves dimensions and style',()=>{
 expect(inferBuildingUse('Create a lunar archival facility, 32m wide.')).toBe('lunar archival facility');
 expect(inferBuildingUse('Make a purple sphere')).toBeUndefined();expect(inferBuildingUse('Move the building')).toBeUndefined();
 const options=buildingOptions({brief:'Create a brutalist lunar archival facility, 32m wide and 18m tall.'});
 expect(options).toMatchObject({width:32,height:18,style:'concrete',designStyle:'brutalist'});
 expect(buildingCatalogContext('Create a lunar archival facility')).toContain('buildingUse=');
 expect(buildingCatalogContext('Create a lunar archival facility')).toContain('No dedicated recipe');
});
test('invalid catalog IDs and invalid feature selections never mutate geometry',()=>{
 const {api}=setup();
 for(const input of [{catalogId:'not_a_recipe'},{buildingUse:''},{buildingUse:'a'.repeat(121)},{buildingUse:'lab',features:['unknown']},{buildingUse:'lab',features:['porch','dome','spire','canopy','balconies']}])expect(()=>createBuilding(api,input)).toThrow();
 expect(api.getAllFaces()).toHaveLength(0);
});

test('duplicate features are normalized, and custom city blocks are undoable',()=>{
 const {createCity}=require('../../../implementations/ai.chat/architecture');
 expect(buildingOptions({buildingUse:'archive facility',features:['canopy','canopy']}).features).toEqual(['canopy']);
 const {api,doc}=setup();const result=createCity(api,{buildingUse:'quantum archives facility',count:2,detail:1,seed:5});
 expect(result.summary).toContain('No dedicated recipe');expect(api.getAllFaces().length).toBeGreaterThan(0);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
