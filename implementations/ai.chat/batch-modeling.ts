import type {IModelAPI} from '../api.model/ModelAPI';
import type {AIResponse,TurnMessage} from './chat-runner';
import {createObject,objectOptions,surfaceOptions} from './objects';
import {buildingOptions,buildingMesh,createBuilding,architectureBrief} from './architecture';

export const MAX_BATCH_COMMANDS=15;
export const MAX_BATCH_OBJECTS=150;
type Parameters=Record<string,unknown>;
export type BatchCommand={kind:'box'|'object'|'building';count:number;parameters:Parameters};
export type BatchPlan={commands:BatchCommand[];gap?:number;columns?:number;x?:number;z?:number};
export type BatchHooks={stopped?:()=>boolean;onProgress?:(text:string)=>void;onBatch?:()=>void;yieldControl?:()=>Promise<void>};
const parameterSchema={type:'object',properties:{type:{type:'string'},shape:{type:'string'},roof:{type:'string'},style:{type:'string'},city:{type:'string'},width:{type:'number'},depth:{type:'number'},height:{type:'number'},radius:{type:'number'},floors:{type:'integer'},twist:{type:'number'},taper:{type:'number'},detail:{type:'integer'},segments:{type:'integer'},angle:{type:'number'},thickness:{type:'number'},fill:{type:'number'},color:{type:'string'},material:{type:'string'}},additionalProperties:false};
export const BATCH_TOOL={name:'create_batch',description:'Queue up to 15 creation commands and 150 objects total. Each command gives kind (box, object, building), count and shared parameters. Place objects automatically in a spaced grid. Reuse one command with count=150 rather than writing 150 copies. Supports all create_object shapes and basic create_building forms. Buildings default to detail 1 for large scenes; specify detail 2 or 3 when requested. One undo step per object. Stop preserves completed objects.',input_schema:{type:'object' as const,properties:{commands:{type:'array',minItems:1,maxItems:MAX_BATCH_COMMANDS,items:{type:'object',properties:{kind:{type:'string',enum:['box','object','building']},count:{type:'integer',minimum:1,maximum:MAX_BATCH_OBJECTS},parameters:parameterSchema},required:['kind','count','parameters'],additionalProperties:false}},gap:{type:'number',minimum:0},columns:{type:'integer',minimum:1,maximum:150},x:{type:'number'},z:{type:'number'}},required:['commands'],additionalProperties:false}};
function numeric(value:unknown,fallback:number,min:number,max:number,label:string,integer=false){const n=value??fallback;if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(`${label} must be ${integer?'an integer':'a number'} from ${min} to ${max}.`);return n;}
/** Resolve and validate every command before any mutation, including surfaces. */
export function validateBatch(input:Record<string,unknown>){
 if(!Array.isArray(input.commands)||!input.commands.length||input.commands.length>MAX_BATCH_COMMANDS)throw new Error('Use 1–15 commands in one batch.');
 let total=0,estimatedFaces=0;
 const commands=input.commands.map((raw:any)=>{
  if(!raw||!['box','object','building'].includes(raw.kind)||!raw.parameters||typeof raw.parameters!=='object'||Array.isArray(raw.parameters))throw new Error('Each command needs a supported kind and parameters.');
  const count=numeric(raw.count,1,1,150,'count',true);total+=count;
  const p:Parameters={...raw.parameters};delete p.brief;delete p.x;delete p.y;delete p.z;
  let width:number,depth:number,minX=0,minZ=0;
  if(raw.kind==='building'){
   p.detail??=1;const o=buildingOptions(p),mesh=buildingMesh(o);
   Object.assign(p,o);estimatedFaces+=count*mesh.faces.length;
   const xs=mesh.vertices.map(v=>v.x),zs=mesh.vertices.map(v=>v.z);width=Math.max(...xs)-Math.min(...xs);depth=Math.max(...zs)-Math.min(...zs);minX=Math.min(...xs);minZ=Math.min(...zs);
  }else if(raw.kind==='object'){
   p.segments??=16;const o=objectOptions(p);
   width=depth=Math.max(o.width,o.depth,2*(o.r+o.tube));
   if(!['table','chair','water'].includes(String(o.type))){minX=minZ=-o.r-o.tube;}
   estimatedFaces+=count*(o.type==='sphere'?o.segments*o.segments/2:o.type==='torus'||o.type==='arc'?o.segments*12+2:200);
  }else{
   p.width=width=numeric(p.width,1,.001,2000,'width');p.depth=depth=numeric(p.depth,1,.001,2000,'depth');p.height=numeric(p.height,1,.001,2000,'height');surfaceOptions(p);estimatedFaces+=count*6;
  }
  return {kind:raw.kind as BatchCommand['kind'],count,parameters:p,width,depth,minX,minZ};
 });
 if(total>MAX_BATCH_OBJECTS)throw new Error(`This batch contains ${total} objects. Use up to 150 objects per batch.`);
 if(estimatedFaces>250000)throw new Error('This batch needs too much geometry. Lower detail or curve segments while keeping the object count.');
 const gap=numeric(input.gap,2,0,2000,'gap'),columns=numeric(input.columns,Math.ceil(Math.sqrt(total)),1,150,'columns',true);
 const x=numeric(input.x,0,-100000,100000,'x'),z=numeric(input.z,0,-100000,100000,'z');
 const cellWidth=Math.max(...commands.map(c=>c.width))+gap,cellDepth=Math.max(...commands.map(c=>c.depth))+gap;
 let index=0;for(const command of commands)for(let i=0;i<command.count;i++,index++){
  const limit=command.kind==='building'?100000:1000000;
  if(Math.abs(x+(index%columns)*cellWidth-command.minX)>limit||Math.abs(z+Math.floor(index/columns)*cellDepth-command.minZ)>limit)throw new Error('This layout extends beyond supported coordinates. Use fewer columns or smaller spacing.');
 }
 return {commands,total,gap,columns,x,z,cellWidth,cellDepth};
}
export async function createBatch(api:IModelAPI,input:Record<string,unknown>,hooks:BatchHooks={}){
 const plan=validateBatch(input),faces:string[]=[];let completed=0,stopped=false,error:string|undefined;
 const yieldControl=hooks.yieldControl??(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));
 outer:for(let c=0;c<plan.commands.length;c++){
  const command=plan.commands[c];
  for(let i=0;i<command.count;i++){
   await yieldControl();if(hooks.stopped?.()){stopped=true;break outer;}
   hooks.onProgress?.(`Building ${completed+1} of ${plan.total} objects · command ${c+1} of ${plan.commands.length}`);
   const parameters:Parameters & {x:number;z:number}={...command.parameters,x:plan.x+(completed%plan.columns)*plan.cellWidth-command.minX,z:plan.z+Math.floor(completed/plan.columns)*plan.cellDepth-command.minZ};
   try {
    let ids:string[]=[];
    // Per-object transactions make cancellation and partial failure recoverable.
    if(command.kind==='building')ids=createBuilding(api,parameters).created.faces;
    else if(command.kind==='object')ids=createObject(api,parameters).created.faces;
    else api.batch('Create batch box',()=>{const result=api.createBox({x:parameters.x,y:0,z:parameters.z},Number(parameters.width),Number(parameters.depth),Number(parameters.height));const surface=surfaceOptions(parameters);api.setFaceMaterial(result.faceIds,api.createMaterial(surface.name,surface.color,surface));ids=result.faceIds;});
    if(!ids.length)throw new Error('The object produced no geometry.');
    faces.push(...ids);completed++;
   }catch(e){error=e instanceof Error?e.message:String(e);break outer;}
   if(completed%5===0)hooks.onBatch?.();
  }
 }
 hooks.onBatch?.();
 const summary=`${stopped?'Stopped after creating':error?'Created':'Created'} ${completed} of ${plan.total} objects across ${plan.commands.length} commands.${error?` The next object failed: ${error}`:''} ${completed===plan.total?'Batch complete. ':''}Undo reverses one object at a time.${plan.commands.some(c=>c.kind==='building')?' Building detail follows each command; default is level 1.':''}`;
 return {ok:!error,stopped,error,completed,total:plan.total,commands:plan.commands.length,created:{faces},summary};
}

/** Shortcut only for explicit, fully supported creation lists; other requests use AI. */
export function directBatchPlan(text:string):BatchPlan|null {
 if(!/\b(create|build|make|add|generate)\b/i.test(text)||/\b(don't|do not|without|except|delete|remove|move|rotate|selected|existing|instead|not)\b/i.test(text))return null;
 const clauses=text.split(/\n+|;|,\s*(?=(?:(?:create|build|make|add|generate)\s+)?\d+\s)|\band\s+(?=(?:(?:create|build|make|add|generate)\s+)?(?:\d+|a|an)\s)/i).map(s=>s.trim().replace(/^\d+[.)]\s*/,'' )).filter(Boolean);
 const commands:BatchCommand[]=[];
 for(const clause of clauses){
  const match=clause.match(/^(?:(?:please\s+)?(?:create|build|make|add|generate)\s+)?(\d+|a|an)\s+(?:(red|blue|green|yellow|white|black|wood|metal|glass)\s+)?(boxes|box|cubes?|spheres?|balls?|cylinders?|cones?|torus|toruses|donuts?|arcs?|tables?|chairs?|houses?|buildings?|towers?|offices?|warehouses?|pavilions?|apartments?|objects?)\b(.*)$/i);
  if(!match)return null;
  const tail=match[4];
  // Preserve novel instructions for the AI instead of silently ignoring them.
  let remaining=tail.replace(/[,;:]|[.!]$/g,' ').replace(/\b(?:each|in a grid|please)\b/gi,'').replace(/\d+(?:\.\d+)?\s*(?:m|meters?|metres?|ft|feet)\s*(?:wide|deep|tall|high)/gi,'').replace(/\b(?:with a |with |a |and )?(?:flat|gable|hip|dome|pyramid|spire) roof\b/gi,'').replace(/\bdetail(?: level)?\s*[123]\b/gi,'').trim();
  if(remaining)return null;
  const count=/^a/i.test(match[1])?1:Number(match[1]),noun=match[3].toLowerCase();
  const building=/^(house|building|tower|office|warehouse|pavilion|apartment)/.test(noun);
  const kind=building?'building':/^(box|cube|object)/.test(noun)?'box':'object';
  const type=/^house/.test(noun)?'house':/^building|^office/.test(noun)?'office':/^tower/.test(noun)?'skyscraper':/^warehouses?/.test(noun)?'warehouse':/^pavilion/.test(noun)?'pavilion':/^apartment/.test(noun)?'apartment':/^ball/.test(noun)?'sphere':/^donut|^torus/.test(noun)?'torus':noun.replace(/s$/,'');
  const parameters:Parameters={...architectureBrief(tail)};
  if(kind!=='box')parameters.type=type;
  if(match[2])parameters[/wood|metal|glass/.test(match[2])?'material':'color']=match[2].toLowerCase();
  if(building&&match[2])return null; // building colors/materials use its own architecture schema
  commands.push({kind,count,parameters});
 }
 if(commands.length===1&&commands[0].count===1)return null;
 return {commands};
}
export function createBatchResponder(plan:BatchPlan):(messages:TurnMessage[])=>AIResponse {
 let sent=false;const id='direct-batch';
 return messages=>{
  if(!sent){sent=true;return {content:[{type:'tool_use',id,name:'create_batch',input:plan as unknown as Parameters}],stop_reason:'tool_use'};}
  const last=messages[messages.length-1],receipt=Array.isArray(last?.content)?last.content.find((r:any)=>r.type==='tool_result'&&r.tool_use_id===id):null;
  if(!receipt)return {error:'The batch returned no receipt. Review the model before retrying.'};
  let result;try{result=JSON.parse(receipt.content);}catch{return {error:'The batch returned an unreadable receipt.'};}
  return result.summary?{content:[{type:'text',text:result.summary}],stop_reason:'end_turn'}:{error:result.error||'The batch did not complete.'};
 };
}
