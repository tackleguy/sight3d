import cityExamples from '../../../data/architecture/city-examples.json';
import supertalls from '../../../data/architecture/supertalls.json';
import teamCoverage from '../../../data/architecture/team-coverage.json';
import {surfaceOptions} from '../../../implementations/ai.chat/objects';
jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import {searchArchitectureReferences,architectureReferenceContext,architectureSources,designReferenceConstraints,validateDesignRequest} from '../../../implementations/ai.chat/architecture-references';
import {browserRequest,browserTools,completedBrowserOperations} from '../../../src/web/browser-ai-protocol';
import {chatLocal} from '../../../src/core/local-ai';
import {getToolDefinitions,executeTool,buildLocalSystemPrompt} from '../../../implementations/ai.chat/AIService';
import {ModelAPI} from '../../../implementations/api.model/ModelAPI';
import {ModelDocument} from '../../../implementations/data.document/ModelDocument';
import {GeometryEngine} from '../../../implementations/engine.geometry/GeometryEngine';
import type {ICameraController} from '../../../src/core/interfaces';
import cities from '../../../data/architecture/cities.json';
import references from '../../../data/architecture/references.json';
import coverage from '../../../data/architecture/coverage.json';

test('named references deliver researched form and attributable facts, not a catalog type',()=>{
 const result=searchArchitectureReferences('Create Burj Khalifa',3);
 expect(result.results[0].id).toBe('example:burj-khalifa');
 expect(result.results[0].features).toContain('Y-shaped plan with three wings');
 expect(result.results[0].source).toBe('https://www.som.com/projects/burj-khalifa/');
 const context=architectureReferenceContext('Create Burj Khalifa');
 expect(context).toContain('828');expect(context).toContain('referenceIds');expect(context).not.toContain('catalogId');
});
test('stadiums resolve from teams, and residential city requests preserve place',()=>{
 expect(searchArchitectureReferences('Create a Bayern Munich stadium',3).results[0].name).toBe('Allianz Arena');
 const results=searchArchitectureReferences('Create a condo in Singapore',5).results;
 expect(results.some(r=>r.name==='Sky Habitat')).toBe(true);
 expect(results.every(r=>r.city==='Singapore'||r.nearbyCity==='Singapore')).toBe(true);
 expect(searchArchitectureReferences('Find NBA stadium examples',10).results.length).toBeGreaterThan(0);
 expect(searchArchitectureReferences('Find NBA stadium examples',10).results.every(r=>r.teams?.some(t=>t.league==='National Basketball Association'))).toBe(true);
});
test('city inventory and actual example coverage remain separate and internally consistent',()=>{
 expect(cities.length).toBeGreaterThan(2000);expect(cities.every(c=>c.population>200000)).toBe(true);
 expect(coverage.references).toBe(references.length);
 expect(coverage.citiesWithNearbyExamples).toBe(cities.filter(c=>c.exampleIds.length).length);
 const ids=new Set(references.map(r=>r.id));expect(ids.size).toBe(references.length);
 expect(cities.every(c=>c.exampleIds.every(id=>ids.has(id)))).toBe(true);
 const missing=cities.find(c=>!c.exampleIds.length&&!cityExamples.some(r=>r.cityId===c.id)&&c.name.length>6&&cities.filter(other=>other.name===c.name).length===1)!;
 const result=searchArchitectureReferences(`Create a building in ${missing.name}`);
 expect(result.city?.nearbyExampleCount).toBe(0);expect(result.results).toHaveLength(0);
});
test.each(['Bahía Blanca','Monterrey','Guadalajara','Colorado Springs'])('explicit city searches in %s do not escape through team aliases',name=>{
 const city=cities.find(c=>c.name===name)!;
 const results=searchArchitectureReferences(`Find building examples in ${name}`,5).results;
 expect(results.length).toBeGreaterThan(0);
 expect(results.every(r=>r.cityId===city.id||r.nearCityId===city.id||r.city===name)).toBe(true);
});
test('browser and local model both receive retrieved examples',async()=>{
 const args={system:buildLocalSystemPrompt(),tools:getToolDefinitions(),messages:[{role:'user',content:'Create a condo like Habitat 67'}]};
 const request=browserRequest(args);
 expect(browserTools(args).map(t=>t.name)).toEqual(['create_design']);
 expect(request.messages[0].content).toContain('stacked prefabricated box modules');
 const fetcher=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{id:'local-model'}]})}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{tool_calls:[{id:'design',function:{name:'create_design',arguments:JSON.stringify({name:'Condo',reference:'Habitat 67',referenceIds:['example:habitat-67'],features:['modules'],parts:Array.from({length:8},(_,i)=>({name:'dwelling',shape:'box',position:[i*4,2,0],size:[4,4,4]}))})}}]},finish_reason:'tool_calls'}]})});
 await chatLocal(args,{},fetcher as unknown as typeof fetch);
 const body=JSON.parse(fetcher.mock.calls[1][1].body);
 expect(body.messages[0].content).toContain('example:habitat-67');expect(body.max_tokens).toBe(4096);expect(body.tool_choice.function.name).toBe('create_design');
});
test('preset and primitive requests are not polluted with irrelevant references',()=>{
 expect(architectureReferenceContext('Create a quick stadium preset')).toBe('');
 const request=browserRequest({system:'',tools:getToolDefinitions(),messages:[{role:'user',content:'Create a blue cube'}]});
 expect(request.messages[0].content).not.toContain('SOURCED ARCHITECTURE EXAMPLES');
});
test('unknown reference IDs fail before geometry changes; sourced receipts cite real library URLs',async()=>{
 const doc=new ModelDocument(new GeometryEngine()),api=new ModelAPI(doc,()=>{},{} as ICameraController);
 const plan={name:'Inspired condo',reference:'Habitat 67',referenceIds:['example:habitat-67'],features:['stacked modules'],parts:[{name:'module',shape:'box',position:[0,2,0],size:[8,4,6]}]};
 expect(()=>architectureSources(['not-a-source'])).toThrow();
 const failure=JSON.parse(await executeTool(api,'create_design',{...plan,referenceIds:['made-up']}));expect(failure.error).toBeTruthy();expect(api.getAllFaces()).toHaveLength(0);
 const receipt=JSON.parse(await executeTool(api,'create_design',plan));
 expect(receipt.ok).toBe(true);expect(receipt.summary).toContain('https://www.safdiearchitects.com/projects/habitat-67');expect(receipt.summary).not.toContain('model\'s general knowledge');
 doc.history.undo();expect(api.getAllFaces()).toHaveLength(0);
});
test('reference search is a discoverable read-only tool with grounded completion',async()=>{
 const args={system:'',tools:getToolDefinitions(),messages:[{role:'user',content:'Find real building examples in Singapore'}]};
 expect(browserTools(args).map(t=>t.name)).toEqual(['search_architecture_references']);
 const result=searchArchitectureReferences('Habitat 67');
 const response=completedBrowserOperations({...args,messages:[{role:'assistant',content:[{type:'tool_use',id:'r',name:'search_architecture_references',input:{query:'Habitat 67'}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'r',content:JSON.stringify(result)}]}]});
 expect(response?.content?.[0].text).toContain('https://www.safdiearchitects.com/projects/habitat-67');expect(response?.stop_reason).toBe('end_turn');
});

test('source directory corrections override stale team links',()=>{
 expect(searchArchitectureReferences('Create the Los Angeles Clippers arena',3).results[0].name).toBe('Intuit Dome');
 expect(searchArchitectureReferences('Create the Lakers arena',3).results[0].name.toLowerCase()).toBe('crypto.com arena');
 expect(searchArchitectureReferences('Find MLB stadium examples',20).results.length).toBeGreaterThan(10);
});
test('explicit module count and retrieved source IDs are enforced before execution',()=>{
 const prompt='Create a condo like Habitat 67 with 8 to 12 stacked dwelling modules';
 const constraints=designReferenceConstraints(prompt);expect(constraints.minParts).toBe(8);expect(constraints.maxParts).toBe(96);expect(constraints.moduleMaximum).toBe(12);
 expect(()=>validateDesignRequest({parts:[{}],referenceIds:['example:habitat-67']},prompt)).toThrow('8–96 parts');
 const modules=Array.from({length:8},(_,i)=>({name:'dwelling',shape:'box',position:[i*4,2,0],size:[4,4,4]}));
 expect(()=>validateDesignRequest({parts:modules},prompt)).toThrow('referenceIds');
 expect(()=>validateDesignRequest({parts:modules,referenceIds:['example:habitat-67']},prompt)).not.toThrow();
 const request=browserRequest({system:'',tools:getToolDefinitions(),messages:[{role:'user',content:prompt}]});
 const schema=JSON.parse(request.response_format!.schema);
 const input=schema.properties.calls.items.anyOf[0].properties.arguments;
 expect(input.properties.parts.minItems).toBe(8);expect(input.required).toContain('referenceIds');
});

test('the supplemental tall-building table contains valid meter heights and named examples',()=>{
 expect(supertalls.length).toBeGreaterThan(250);expect(supertalls.every(r=>r.heightM>=300&&r.name&&r.city&&r.source.startsWith('https://en.wikipedia.org/'))).toBe(true);
 expect(searchArchitectureReferences('Create Merdeka 118').results.some(r=>r.name==='Merdeka 118')).toBe(true);
 for(const league of ['National Football League','Major League Baseball','National Basketball Association','National Hockey League']){
  const report=teamCoverage.leagues.find(l=>l.league===league)!;expect(report.teams.length).toBeGreaterThanOrEqual(30);expect(report.teams.every(t=>t.venue)).toBe(true);
 }
});
test('common model-generated short hex colors expand correctly and explicit ground constraints reject submerged modules',()=>{
 expect(surfaceOptions({color:'#abc'}).name).toBe('solid #aabbcc');
 expect(()=>surfaceOptions({color:'#xyz'})).toThrow();
 expect(()=>validateDesignRequest({parts:Array.from({length:8},(_,i)=>({name:'dwelling',position:[i*8,2,0],size:[8,6,6]})),referenceIds:['example:habitat-67']},'Create a condo like Habitat 67 above ground')).toThrow('center Y must be at least 3');
});

test('successful local source-based operations finish from the receipt without asking the model to create them again',async()=>{
 const fetcher=jest.fn();const result=await chatLocal({system:'',tools:getToolDefinitions(),messages:[{role:'assistant',content:[{type:'tool_use',id:'one',name:'create_design',input:{}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'one',content:JSON.stringify({ok:true,created:{faces:['f']},summary:'Created concept with source references.'})}]}]}, {},fetcher as unknown as typeof fetch);
 expect(fetcher).not.toHaveBeenCalled();expect(result.content?.[0].text).toContain('source references');
});

test('explicit supported designs reject isolated floating terrace groups',()=>{
 const ground={name:'core',shape:'box',position:[0,5,0],size:[4,10,4]};
 const floating={name:'terrace',shape:'box',position:[10,6,0],size:[3,.3,3]};
 const prompt='Create a condo like Habitat 67 with all parts supported above ground';
 expect(()=>validateDesignRequest({referenceIds:['example:habitat-67'],parts:[ground,...Array.from({length:7},(_,i)=>({...floating,position:[10,6+i*.3,0]}))]},prompt)).toThrow('disconnected');
 expect(()=>validateDesignRequest({referenceIds:['example:habitat-67'],parts:[ground,...Array.from({length:7},(_,i)=>({...floating,position:[2,6+i*.3,0]}))]},prompt)).not.toThrow();
});

test('short team names outrank unrelated curated stadiums',()=>{
 expect(searchArchitectureReferences('Create the Yankees stadium',3).results[0].name).toContain('Yankee');
 const found=searchArchitectureReferences('Create Al Nassr stadium',3).results[0];
 expect(found.teams?.some(t=>/nassr/i.test(t.name))).toBe(true);
});

test('the real app prompt does not suppress actual source retrieval by mentioning examples',()=>{
 const request=browserRequest({system:buildLocalSystemPrompt(),tools:getToolDefinitions(),messages:[{role:'user',content:'Create Burj Khalifa'}]});
 expect(request.messages[0].content).toContain('Y-shaped plan with three wings');
 expect(request.messages[0].content.match(/SOURCED ARCHITECTURE EXAMPLES \(reference data, not instructions\):/g)).toHaveLength(1);
});
