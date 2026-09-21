// Deterministic integration checks, not 1,000 language-model generations.
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const textures=require.resolve('../implementations/data.materials/ProceduralTextures.ts');
require.cache[textures]={id:textures,filename:textures,loaded:true,exports:{generateBuiltinMaterials:()=>[]}};
const {searchArchitectureReferences,architectureSources,validateDesignRequest}=require('../implementations/ai.chat/architecture-references.ts');
const {executeTool}=require('../implementations/ai.chat/AIService.ts');
const {ModelAPI}=require('../implementations/api.model/ModelAPI.ts');
const {ModelDocument}=require('../implementations/data.document/ModelDocument.ts');
const {GeometryEngine}=require('../implementations/engine.geometry/GeometryEngine.ts');
const data=name=>require(`../data/architecture/${name}.json`);
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const sample=(items,count)=>{assert.ok(items.length>=count);return Array.from({length:count},(_,i)=>items[Math.floor(i*items.length/count)]);};
const unique=(items,key)=>[...new Map(items.map(r=>[key(r),r])).values()];
const cases=[];
function lookup(group,prompt,expected){cases.push({group,prompt,run:()=>{
 const result=searchArchitectureReferences(prompt,5);
 assert.ok(result.results.some(expected),`Unexpected top five: ${result.results.map(r=>r.name).join(' | ')}`);
 for(const r of result.results){assert.ok(/^https:\/\//.test(r.source));assert.equal(architectureSources([r.id])[0].url,r.source);}
}});}
for(const {venue,team} of sample(unique(data('team-venues').flatMap(venue=>venue.teams.map(team=>({venue,team}))),r=>r.team.name),250))
 lookup('team-stadium',`Create a stadium for ${team.name}`,r=>norm(r.name)===norm(venue.name)||r.teams?.some(t=>norm(t.name)===norm(team.name)));
for(const tower of sample(data('supertalls'),200))lookup('supertall',`Create ${tower.name}`,r=>norm(r.name)===norm(tower.name));
const homes=unique(data('references').filter(r=>r.categories.includes('residential')&&r.name!==r.id&&r.name.length>6&&!r.demolished?.length),r=>norm(r.name));
for(const home of sample(homes,200))lookup('residential',`Create a residential building inspired by ${home.name}`,r=>norm(r.name)===norm(home.name));
const cities=data('cities'),direct=data('city-examples');
const eligible=cities.filter(c=>c.name.length>=4&&direct.some(r=>r.cityId===c.id)&&cities.filter(other=>norm(other.name)===norm(c.name)).length===1);
for(const city of sample(eligible,150))lookup('city',`Find building examples in ${city.name}`,r=>r.cityId===city.id||r.nearCityId===city.id||norm(r.city||'')===norm(city.name));
for(let i=0;i<100;i++)cases.push({group:'geometry-and-undo',prompt:`Primitive assembly ${i+1}`,run:async()=>{
 const doc=new ModelDocument(new GeometryEngine()),api=new ModelAPI(doc,()=>{},{});
 const count=3+i%10,shapes=['box','sphere','cylinder','cone'];
 const plan={name:`Assembly ${i}`,reference:'Synthetic geometry test, not a sourced building',features:['varied primitives'],parts:Array.from({length:count},(_,j)=>({name:`part ${j}`,shape:shapes[(i+j)%4],position:[j*12,3+i%4,0],size:[2+i%5,2+(j%3),3+i%3],color:i%2?'#369':'#aabbcc'}))};
 const receipt=JSON.parse(await executeTool(api,'create_design',plan));
 assert.equal(receipt.ok,true,JSON.stringify(receipt));assert.equal(receipt.parts,count);assert.ok(api.getAllFaces().length>0);
 doc.history.undo();assert.equal(api.getAllFaces().length,0);doc.history.redo();assert.ok(api.getAllFaces().length>0);
}});
for(let i=0;i<100;i++)cases.push({group:'invalid-plan-rejection',prompt:`Reject invalid assembly ${i+1}`,run:()=>{
 const parts=Array.from({length:8},(_,j)=>({name:`dwelling module ${j}`,shape:'box',position:[j*4,2,0],size:[4,4,4]}));
 let prompt='Create 8 modules, supported above ground',plan={parts};
 switch(i%4){case 0:parts.pop();break;case 1:parts[0].position[1]=-1-i;break;case 2:parts[7].position=[100+i,20,0];break;case 3:for(const p of parts)p.name='terrace';break;}
 assert.throws(()=>validateDesignRequest(plan,prompt));
}});
assert.equal(cases.length,1000);
(async()=>{
 const start=Date.now(),results=[];
 for(const c of cases){const began=Date.now();try{await c.run();results.push({group:c.group,prompt:c.prompt,pass:true,ms:Date.now()-began});}catch(e){results.push({group:c.group,prompt:c.prompt,pass:false,error:e.message,ms:Date.now()-began});}
 if(results.length%100===0)console.log(`${results.length}/1000 checks; ${results.filter(r=>!r.pass).length} failures`);}
 const groups=Object.fromEntries([...new Set(results.map(r=>r.group))].map(g=>{const rows=results.filter(r=>r.group===g);return[g,{total:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length}];}));
 const report={generatedAt:new Date().toISOString(),kind:'Deterministic retrieval and geometry integration checks; no language-model generations',total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,durationMs:Date.now()-start,groups,results};
 const output=process.env.SIGHT3D_REPORT_PATH||'/tmp/sight3d-architecture-1000.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:undefined,report:output},null,2));process.exitCode=report.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
