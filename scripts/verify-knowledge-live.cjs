// Optional: exercise a real local model's knowledge-based design plan and geometry.
// LM Studio must already be running; no cloud inference or model download.
const ts=require('typescript'),fs=require('node:fs'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const textures=require.resolve('../implementations/data.materials/ProceduralTextures.ts');
require.cache[textures]={id:textures,filename:textures,loaded:true,exports:{generateBuiltinMaterials:()=>[]}};
(async()=>{
 const {getToolDefinitions,buildLocalSystemPrompt,executeTool}=require('../implementations/ai.chat/AIService.ts');
 const {browserRequest,generateBrowserResponse}=require('../src/web/browser-ai-protocol.ts');
 const {ModelAPI}=require('../implementations/api.model/ModelAPI.ts'),{ModelDocument}=require('../implementations/data.document/ModelDocument.ts'),{GeometryEngine}=require('../implementations/engine.geometry/GeometryEngine.ts');
 const models=await fetch('http://127.0.0.1:1234/v1/models').then(r=>r.json());
 const model=process.env.SIGHT3D_TEST_MODEL||models.data.find(m=>!/(embedding|comfyui)/i.test(m.id))?.id;assert.ok(model,'Load a local chat model in LM Studio first');
 const tools=getToolDefinitions(),args={system:buildLocalSystemPrompt(),tools,messages:[{role:'user',content:process.env.SIGHT3D_TEST_PROMPT||'Create a traditional coastal lighthouse based on a typical example you know. Include its recognizable parts, with the base at ground level.'}]};
 console.log(`Testing real local model: ${model}`);
 const parsed=await generateBrowserResponse(args,async request=>{
  const response=await fetch('http://127.0.0.1:1234/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,model,response_format:{type:'json_schema',json_schema:{name:'design',strict:true,schema:JSON.parse(request.response_format.schema)}}}),signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error(`Local model HTTP ${response.status}: ${await response.text()}`);
  const data=await response.json();fs.writeFileSync('/tmp/sight3d-knowledge-live-response.json',JSON.stringify(data,null,2));return data;
 });
 const calls=parsed.content.filter(b=>b.type==='tool_use');assert.equal(calls.length,1);assert.equal(calls[0].name,'create_design');
 fs.writeFileSync('/tmp/sight3d-knowledge-live-plan.json',JSON.stringify(calls[0].input,null,2));
 const doc=new ModelDocument(new GeometryEngine()),api=new ModelAPI(doc,()=>{},{});
 const result=JSON.parse(await executeTool(api,calls[0].name,calls[0].input));assert.equal(result.ok,true,JSON.stringify(result));assert.ok(result.parts>=3);assert.ok(result.created.faces.length>20);
 doc.history.undo();assert.equal(api.getAllFaces().length,0);
 console.log(JSON.stringify({model,reference:result.reference,features:result.features,parts:result.parts,faces:result.created.faces.length,undo:'passed'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
