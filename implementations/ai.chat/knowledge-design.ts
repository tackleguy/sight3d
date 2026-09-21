import type { IModelAPI } from '../api.model/ModelAPI';
import { surfaceOptions } from './objects';
import { architectureSources } from './architecture-references';

export const KNOWLEDGE_DESIGN_PROMPT = `Use your pretrained general knowledge to choose a familiar example or typical object of the requested kind. Identify its visible, defining features and express them as a coherent create_design assembly. If the user names an example, use that example; otherwise choose a typical one. Prioritize silhouette, proportions, recognizable parts and material contrast over small details. Design the whole object, not just one generic box. Keep the reference and feature descriptions short and public-facing; do not supply hidden reasoning. Use supplied SOURCED ARCHITECTURE EXAMPLES when available and name the referenceIds you actually use. Otherwise this is memory-based concept design. Never claim you viewed an image, measured a blueprint, verified missing facts, or retrained your weights. If you do not know the example, say so and use a labeled typical concept. Respect user dimensions. Place parts deliberately in meters with Y up, using center positions and full sizes. For upright parts resting on the ground, center Y = height/2. For stacked parts, next center Y = previous center Y + previous height/2 + next height/2. Example: a column 2m wide and 10m tall is size [2,10,2], position [0,5,0]; a 1m-high cap directly above it is size [3,1,3], position [0,10.5,0]. Check support and proportions; do not leave lanterns, roofs or balconies floating away from their supports. Use 8–24 parts for a typical concept and more only when needed; tilted boxes can form roof slopes, beams and ramps. Omit optional fields when defaults suffice. Parts may overlap to form an assembly; this does not cut holes or boolean-union them. Preserve empty areas such as stadium fields by arranging stands around them. Use script/API tools for geometry that primitives cannot express. Catalog recipes are optional shortcuts, not a restriction on what you know. Only claim completion after a successful tool result.`;

export function wantsKnowledgeDesign(text:string):boolean {
  if(/\b(preset|catalog|quick)\b/i.test(text))return false;
  if(!/\b(make|create|build|design|generate|model)\b/i.test(text)||/^(?:how|why|what|explain)\b/i.test(text.trim()))return false;
  if(/\b(like|inspired|example|reference|replica|resemble|based on)\b/i.test(text))return true;
  // Exact primitive requests retain their smaller tool schema.
  return !/^(?:(?:please|can you)\s+)?(?:make|create|build|generate)\s+(?:me\s+)?(?:a|an|one)\s+(?:(?:red|blue|green|glass|wood|metal|solid)\s+)?(?:box|cube|sphere|cylinder|cone|torus|arc)\b/i.test(text.trim());
}
const vecSchema={type:'array',items:{type:'number'},minItems:3,maxItems:3};
export const KNOWLEDGE_DESIGN_TOOL={name:'create_design',description:'Build an original multi-part concept inspired by an example in your learned knowledge. Reference is an inspiration label, not an internet citation. Use positioned/rotated primitive parts to reproduce recognizable features of buildings or other objects. All positions are CENTERS in meters; size is full [width,height,depth]; Y is up. Rotation is [X,Y,Z] degrees about each part center. Boxes, ellipsoids, elliptical cylinders and cones supported. One undo step.',input_schema:{type:'object' as const,properties:{
 referenceIds:{type:'array',maxItems:3,items:{type:'string'},description:'IDs of supplied sourced architecture examples actually used, or omit for memory-only concepts.'},
 name:{type:'string',minLength:1,maxLength:100},reference:{type:'string',minLength:1,maxLength:200,description:'Known example or typical form; say typical concept when uncertain.'},features:{type:'array',minItems:1,maxItems:8,items:{type:'string',minLength:1,maxLength:120}},
 parts:{type:'array',minItems:1,maxItems:96,items:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:80},shape:{type:'string',enum:['box','sphere','cylinder','cone']},position:{...vecSchema,description:'CENTER [X,Y,Z] in meters. A 10m-tall upright part on the ground has center Y=5.'},size:{...vecSchema,description:'Full [WIDTH along X, HEIGHT along Y, DEPTH along Z]. A round tall column could be [3,20,3].'},rotation:vecSchema,color:{type:'string',pattern:'^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|red|orange|yellow|green|blue|purple|pink|white|black|gray|grey|brown|cyan)$',description:'A supported basic color name or hex RGB color; omit to use the default.'},material:{type:'string',enum:['solid','glass','water','metal','wood']}},required:['name','shape','position','size'],additionalProperties:false}},
},required:['name','reference','features','parts'],additionalProperties:false}};
function label(value:unknown,max:number,field:string):string {
 if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${field} must contain 1–${max} characters.`);return value.trim();
}
function vector(value:unknown,min:number,max:number,field:string):number[]{
 if(!Array.isArray(value)||value.length!==3||!value.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max))throw new Error(`${field} needs three numbers from ${min} to ${max}.`);return value;
}
export function validateKnowledgeDesign(input:Record<string,unknown>){
 const name=label(input.name,100,'name'),reference=label(input.reference,200,'reference');
 const sources=architectureSources(input.referenceIds);
 if(!Array.isArray(input.features)||input.features.length<1||input.features.length>8)throw new Error('List 1–8 recognizable features.');
 const features=input.features.map(f=>label(f,120,'feature'));
 if(!Array.isArray(input.parts)||!input.parts.length||input.parts.length>96)throw new Error('A design needs 1–96 parts.');
 // Validate the entire plan before creating geometry or materials.
 const parts=input.parts.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Each part must be an object.');
  const name=label(raw.name,80,'part name'),shape=raw.shape;
  if(!['box','sphere','cylinder','cone'].includes(shape))throw new Error('Unsupported part shape.');
  return {name,shape,position:vector(raw.position,-100000,100000,'position'),size:vector(raw.size,.001,2000,'size'),rotation:raw.rotation===undefined?[0,0,0]:vector(raw.rotation,-360,360,'rotation'),surface:surfaceOptions(raw)};
 });
 return {name,reference,features,parts,sources};
}
export function createKnowledgeDesign(api:IModelAPI,input:Record<string,unknown>){
 const {name,reference,features,parts,sources}=validateKnowledgeDesign(input);
 const faces:string[]=[],materials=new Map<string,string>();
 api.batch(`Create ${name}`,()=>{
  for(const part of parts){
   const [x,y,z]=part.position,[w,h,d]=part.size,center={x,y,z};let ids:string[];
   if(part.shape==='box')ids=api.createBox({x:x-w/2,y:y-h/2,z:z-d/2},w,d,h).faceIds;
   else if(part.shape==='sphere'){
    ids=api.createSphere(center,.5,8,16).faceIds;api.scaleEntities(ids,{x:w,y:h,z:d},center);
   }else if(part.shape==='cylinder'){
    ids=api.createCylinder({x,y:y-h/2,z},.5,h,20).faceIds;api.scaleEntities(ids,{x:w,y:1,z:d},center);
   }else{
    const vertices=Array.from({length:20},(_,i)=>({x:x+w/2*Math.cos(i*Math.PI/10),y:y-h/2,z:z+d/2*Math.sin(i*Math.PI/10)}));
    vertices.push({x,y:y+h/2,z});
    const polygons=[Array.from({length:20},(_,i)=>i),...Array.from({length:20},(_,i)=>[i,20,(i+1)%20])];
    const result=api.importGeometry(vertices,polygons);if(result.faceIds.length!==polygons.length)throw new Error('A cone part failed; the design was rolled back.');ids=result.faceIds;
   }
   for(let axis=0;axis<3;axis++)if(part.rotation[axis])api.rotateEntities(ids,{x:axis===0?1:0,y:axis===1?1:0,z:axis===2?1:0},part.rotation[axis],center);
   const key=part.surface.name;let material=materials.get(key);
   if(!material){material=api.createMaterial(key,part.surface.color,part.surface);materials.set(key,material);}
   api.setFaceMaterial(ids,material);faces.push(...ids);
  }
 });
 return {ok:true,created:{faces},reference,features,sources,parts:parts.length,summary:`Created ${name} as a ${parts.length}-part concept inspired by ${reference}. Design intent: ${features.join('; ')}. ${sources.length?'Source references: '+sources.map(s=>`[${s.name}](${s.url})`).join(', ')+'. Geometry is an approximation, not a measured replica.':"This uses the model's general knowledge, not a retrieved image or verified blueprint."} Inspect the approximation; Undo reverses the entire design.`};
}
