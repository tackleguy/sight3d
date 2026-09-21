jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import { SPORTS } from '../../../implementations/ai.chat/sports-venues';
import { buildingOptions, buildingMesh, createBuilding, detailBuilding } from '../../../implementations/ai.chat/architecture';
import { resolveBuildingRecipe, searchBuildingCatalog } from '../../../implementations/ai.chat/building-catalog';
import { ModelAPI } from '../../../implementations/api.model/ModelAPI';
import { ModelDocument } from '../../../implementations/data.document/ModelDocument';
import { GeometryEngine } from '../../../implementations/engine.geometry/GeometryEngine';
import type { ICameraController } from '../../../src/core/interfaces';

test.each(SPORTS.map(s=>[s[0],s[1]]))('%s resolves to a sports venue with finite, bounded geometry',(sport,type)=>{
 const brief=`Build a ${sport} ${type}`;
 expect(resolveBuildingRecipe({brief})).toBeDefined();
 const o=buildingOptions({brief,type:'office'}),mesh=buildingMesh(o);
 expect(o.type).toBe(type);expect(o.sport).toBe(sport);
 expect(mesh.faces.length).toBeGreaterThan(50);
 expect(mesh.vertices.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z)&&v.y>=0&&v.y<=o.height)).toBe(true);
 expect(searchBuildingCatalog({query:sport}).matchCount).toBeGreaterThan(0);
});
test('stadium has an open playing area and arenas allow roofless cutaways',()=>{
 const open=buildingMesh(buildingOptions({brief:'Create a basketball arena with an open roof'}));
 const closed=buildingMesh(buildingOptions({brief:'Create a basketball arena'}));
 expect(open.colors).not.toContain(3);expect(closed.colors).toContain(3);
 expect(buildingOptions({brief:'Build a soccer stadium 200m wide and 140m deep'})).toMatchObject({width:200,depth:140,roof:'open'});
 expect(buildingOptions({brief:'Build an ice hockey stadium'}).type).toBe('stadium');
});
test('unlisted sports work through the configurable venue',()=>{
 const o=buildingOptions({type:'stadium',sport:'underwater hockey',width:120,depth:80,rotation:30,x:500,z:200});
 expect(o.sport).toBe('underwater hockey');expect(buildingMesh(o).faces.length).toBeGreaterThan(50);
});
test('sports geometry imports and refinement and undo preserve the bowl',()=>{
 const doc=new ModelDocument(new GeometryEngine()),api=new ModelAPI(doc,()=>{},{} as ICameraController);
 createBuilding(api,{brief:'Create a soccer stadium',detail:1});
 const base=api.getAllFaces().length;
 detailBuilding(api);detailBuilding(api);
 expect(api.getAllFaces()).toHaveLength(buildingMesh(buildingOptions({brief:'Create a soccer stadium',detail:3})).faces.length);
 doc.history.undo();doc.history.undo();expect(api.getAllFaces()).toHaveLength(base);
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
 doc.history.redo();expect(api.getAllFaces()).toHaveLength(base);
});
