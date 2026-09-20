import { ShapeUtils, Vector2 } from 'three';
import type { IModelAPI } from '../api.model/ModelAPI';
import type { Vec3 } from '../../src/core/types';

type Point = { x:number; z:number };
type Section = { at:number; scale:number; rotation:number; offsetX:number; offsetZ:number };
export type BuildingOptions = {
  type:string; shape:string; roof:string; style:string; city:string; floors:number; height:number;
  width:number; depth:number; rotation:number; twist:number; taper:number; detail:number;
  x:number; y:number; z:number; footprint:Point[]; sections:Section[];
};
export type ArchitectureMesh = { vertices:Vec3[]; faces:number[][]; colors:number[] };
const TYPES = ['house','apartment','office','skyscraper','warehouse','pavilion','civic'];
const SHAPES = ['rectangle','circle','ellipse','triangle','hexagon','l_shape','u_shape','custom'];
const ROOFS = ['flat','gable','hip','dome','pyramid','spire'];
const STYLES = ['glass','brick','stone','concrete','terracotta','white'];
const COLORS = [[.69,.7,.71],[.24,.5,.62],[.82,.85,.86],[.18,.22,.27],[.36,.53,.31],[.82,.74,.57],[.49,.24,.19],[.87,.87,.81],[.20,.23,.28]];
const CITY = {
  new_york:{label:'New York',style:'brick',roof:'flat',floors:24,width:24,depth:28,shape:'rectangle'},
  chicago:{label:'Chicago',style:'glass',roof:'flat',floors:32,width:32,depth:28,shape:'rectangle'},
  paris:{label:'Paris',style:'stone',roof:'hip',floors:6,width:28,depth:18,shape:'u_shape'},
  tokyo:{label:'Tokyo',style:'white',roof:'flat',floors:10,width:14,depth:18,shape:'rectangle'},
  dubai:{label:'Dubai',style:'glass',roof:'spire',floors:65,width:38,depth:30,shape:'ellipse'},
  london:{label:'London',style:'brick',roof:'hip',floors:5,width:18,depth:24,shape:'rectangle'},
  barcelona:{label:'Barcelona',style:'terracotta',roof:'flat',floors:6,width:30,depth:24,shape:'u_shape'},
  hong_kong:{label:'Hong Kong',style:'concrete',roof:'flat',floors:45,width:20,depth:24,shape:'rectangle'},
  san_francisco:{label:'San Francisco',style:'white',roof:'gable',floors:3,width:10,depth:20,shape:'rectangle'},
  venice:{label:'Venice',style:'terracotta',roof:'hip',floors:4,width:16,depth:18,shape:'rectangle'},
  sydney:{label:'Sydney',style:'glass',roof:'flat',floors:18,width:28,depth:24,shape:'rectangle'},
  singapore:{label:'Singapore',style:'white',roof:'flat',floors:28,width:32,depth:26,shape:'l_shape'},
};
const PRESETS:Record<string,Record<string,unknown>> = {
  house:{floors:2,height:7,width:12,depth:9,roof:'gable',style:'brick'},
  apartment:{floors:7,height:23,width:26,depth:18,roof:'flat',style:'stone'},
  office:{floors:12,height:45,width:30,depth:22,roof:'flat',style:'glass'},
  skyscraper:{floors:48,height:180,width:30,depth:24,roof:'flat',style:'glass'},
  warehouse:{floors:1,height:9,width:60,depth:38,roof:'gable',style:'concrete'},
  pavilion:{floors:1,height:8,width:24,depth:24,roof:'dome',style:'white',shape:'circle'},
  civic:{floors:3,height:16,width:36,depth:24,roof:'hip',style:'stone'},
};
function numeric(input:Record<string,unknown>,key:string,fallback:number,min:number,max:number,integer=false) {
  const n=input[key] ?? fallback;
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(`${key} must be ${integer?'an integer':'a number'} from ${min} to ${max}.`);
  return n;
}
function choice(input:Record<string,unknown>,key:string,fallback:string,values:string[]) {
  const value=input[key]??fallback;
  if(typeof value!=='string'||!values.includes(value))throw new Error(`${key} must be one of: ${values.join(', ')}.`);
  return value;
}
export function cityKey(value:unknown): keyof typeof CITY | '' {
  const text=String(value??'').toLowerCase().replace(/[_-]/g,' ');
  return (Object.keys(CITY) as Array<keyof typeof CITY>).find(key=>text.includes(key.replace(/_/g,' '))) || '';
}
/** Explicit dimensions and shape words win over guesses from the small model. */
export function architectureBrief(text:string):Record<string,unknown> {
  const out:Record<string,unknown>={};
  const city=cityKey(text);if(city)out.city=city;
  const shapes:Array<[RegExp,string]>=[[/\bl[- ]shaped\b/i,'l_shape'],[/\bu[- ]shaped|\bcourtyard\b/i,'u_shape'],[/\b(round|circular|cylindrical)\b/i,'circle'],[/\b(oval|elliptical)\b/i,'ellipse'],[/\btriangular\b/i,'triangle'],[/\bhexagonal\b/i,'hexagon'],[/\brectangular\b/i,'rectangle']];
  for(const [pattern,shape] of shapes)if(pattern.test(text)){out.shape=shape;break;}
  const types:Array<[RegExp,string]>=[[/\b(warehouse|factory|industrial)\b/i,'warehouse'],[/\b(house|cottage|villa|home)\b/i,'house'],[/\b(pavilion|gazebo)\b/i,'pavilion'],[/\b(apartment|residential)\b/i,'apartment'],[/\b(museum|library|civic|school|hospital)\b/i,'civic'],[/\b(skyscraper|high[- ]?rise|tower)\b/i,'skyscraper'],[/\boffice\b/i,'office']];
  for(const [pattern,type] of types)if(pattern.test(text)){out.type=type;break;}
  const floors=text.match(/\b(\d+)\s*[- ]?(?:floors?|storeys?|stor(?:y|ies))\b/i);if(floors)out.floors=Number(floors[1]);
  for(const [key,words] of [['width','wide|width'],['depth','deep|depth'],['height','tall|high|height']] as const){
    const match=text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(m|meters?|metres?|ft|feet)\\s*(?:${words})\\b`,'i'));
    if(match)out[key]=Number(match[1])*(/ft|feet/i.test(match[2])?.3048:1);
  }
  const detail=text.match(/\bdetail(?:\s+level)?\s*[:=]?\s*([123])\b/i);if(detail)out.detail=Number(detail[1]);
  for(const roof of ROOFS)if(new RegExp(`\\b${roof==='gable'?'gabled?':roof==='hip'?'hipped?|mansard':roof==='dome'?'domed?':roof}\\b`,'i').test(text))out.roof=roof;
  if(/\b(twist|twisting|twisted|spiral)\b/i.test(text))out.twist=Number(text.match(/(?:twist\w*|rotate\w*)\s*(?:by\s*)?(-?\d+)\s*(?:degrees?|°)/i)?.[1]??60);
  if(/\btaper(?:ed|ing)?\b/i.test(text))out.taper=.45;
  for(const style of STYLES)if(new RegExp(`\\b${style}\\b`,'i').test(text))out.style=style;
  return out;
}
export function buildingOptions(raw:Record<string,unknown>):BuildingOptions {
  const explicit=typeof raw.brief==='string'?architectureBrief(raw.brief):{};
  const input:Record<string,unknown>={...raw,...explicit};
  if(typeof raw.brief==='string'){
    // Small models tend to fill every optional field. Keep embellishments opt-in.
    for(const key of ['city','twist','taper','rotation','x','y','z'])if(explicit[key]===undefined)delete input[key];
    if(explicit.floors===undefined)delete input.floors;
    if(explicit.city)for(const key of ['style','roof'])if(explicit[key]===undefined)delete input[key];
    if(!/\b(section|loft|profile)\b/i.test(raw.brief))delete input.sections;
  }
  const type=choice(input,'type','office',TYPES), preset=PRESETS[type];
  const city=cityKey(input.city), regional=city?CITY[city]:null;
  const defaults={...preset,...(regional ? { style:regional.style, roof:regional.roof, ...(input.type===undefined?regional:{}) } : {})};
  const floors=numeric(input,'floors',input.height!==undefined?Math.max(1,Math.min(200,Math.round(Number(input.height)/3.4))):Number(defaults.floors),1,200,true);
  const height=numeric(input,'height',input.floors!==undefined?floors*3.4:Number(preset.height)*(regional&&input.type===undefined?Number(regional.floors)/Number(preset.floors):1),.5,1000);
  const width=numeric(input,'width',Number(defaults.width),1,2000),depth=numeric(input,'depth',Number(defaults.depth),1,2000);
  const shape=choice(input,'shape',String(defaults.shape??'rectangle'),SHAPES);
  let footprint:Point[]=[];
  if(shape==='custom'){
    if(!Array.isArray(input.footprint)||input.footprint.length<3||input.footprint.length>32)throw new Error('A custom footprint needs 3–32 {x,z} points in meters.');
    footprint=input.footprint.map((v:any)=>({x:numeric(v,'x',NaN,-2000,2000),z:numeric(v,'z',NaN,-2000,2000)}));
    validatePolygon(footprint);
    const xs=footprint.map(p=>p.x),zs=footprint.map(p=>p.z);
    const minX=Math.min(...xs),minZ=Math.min(...zs);
    footprint=footprint.map(p=>({x:p.x-minX,z:p.z-minZ}));
  }
  let sections:Section[]=[];
  if(input.sections!==undefined && !(Array.isArray(input.sections)&&input.sections.length===0)){
    if(!Array.isArray(input.sections)||input.sections.length<2||input.sections.length>12)throw new Error('sections needs 2–12 profiles from at=0 to at=1.');
    sections=input.sections.map((s:any)=>({at:numeric(s,'at',NaN,0,1),scale:numeric(s,'scale',1,.1,2),rotation:numeric(s,'rotation',0,-360,360),offsetX:numeric(s,'offsetX',0,-2000,2000),offsetZ:numeric(s,'offsetZ',0,-2000,2000)}));
    if(sections[0].at!==0||sections[sections.length-1].at!==1||sections.some((s,i)=>i>0&&s.at<=sections[i-1].at))throw new Error('Sections must have increasing at values, starting at 0 and ending at 1.');
  }
  if(input.roof==='gable'&&shape!=='rectangle')input.roof='hip';
  return {type,shape,roof:choice(input,'roof',shape==='custom'?'flat':String(defaults.roof),ROOFS),style:choice(input,'style',String(defaults.style),STYLES),city,
    floors,height,width:footprint.length?Math.max(...footprint.map(p=>p.x)):width,depth:footprint.length?Math.max(...footprint.map(p=>p.z)):depth,
    rotation:numeric(input,'rotation',0,-360,360),twist:numeric(input,'twist',0,-180,180),taper:numeric(input,'taper',0,0,.85),detail:numeric(input,'detail',2,1,3,true),
    x:numeric(input,'x',0,-100000,100000),y:numeric(input,'y',0,-100000,100000),z:numeric(input,'z',0,-100000,100000),footprint,sections};
}
function cross(a:Point,b:Point,c:Point){return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);}
function validatePolygon(p:Point[]){
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length];if(Math.hypot(a.x-b.x,a.z-b.z)<.01)throw new Error('Footprint edges must have nonzero length.');
    for(let j=i+1;j<p.length;j++){
      if(j===i+1||(i===0&&j===p.length-1))continue;
      const c=p[j],d=p[(j+1)%p.length];
      if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.z,b.z),Math.min(c.z,d.z))<=Math.min(Math.max(a.z,b.z),Math.max(c.z,d.z)))throw new Error('Custom footprint must not cross or touch itself.');
    }
  }
  const area=p.reduce((sum,a,i)=>sum+a.x*p[(i+1)%p.length].z-p[(i+1)%p.length].x*a.z,0);
  if(Math.abs(area)<.02)throw new Error('Footprint must enclose an area.');
}
function outline(o:BuildingOptions):Point[]{
  let pts:number[][];
  if(o.shape==='custom')return o.footprint;
  if(o.shape==='circle'||o.shape==='ellipse'||o.shape==='hexagon'){
    const n=o.shape==='hexagon'?6:20;pts=Array.from({length:n},(_,i)=>[.5+.5*Math.cos(2*Math.PI*i/n),.5+.5*Math.sin(2*Math.PI*i/n)]);
  }else if(o.shape==='triangle')pts=[[.5,0],[1,1],[0,1]];
  else if(o.shape==='l_shape')pts=[[0,0],[1,0],[1,.38],[.38,.38],[.38,1],[0,1]];
  else if(o.shape==='u_shape')pts=[[0,0],[1,0],[1,1],[.68,1],[.68,.35],[.32,.35],[.32,1],[0,1]];
  else pts=[[0,0],[1,0],[1,1],[0,1]];
  return pts.map(([x,z])=>({x:x*o.width,z:z*o.depth}));
}
class MeshWriter {
  mesh:ArchitectureMesh={vertices:[],faces:[],colors:[]};
  face(points:Vec3[],color:number){const n=this.mesh.vertices.length;this.mesh.vertices.push(...points);this.mesh.faces.push(points.map((_,i)=>n+i));this.mesh.colors.push(color);}
  quad(a:Vec3,b:Vec3,c:Vec3,d:Vec3,color:number){this.face([a,b,c],color);this.face([a,c,d],color);}
}
const mix=(a:Vec3,b:Vec3,t:number):Vec3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function buildingMesh(o:BuildingOptions):ArchitectureMesh {
  const writer=new MeshWriter(), base=outline(o);
  // Normalize to CCW in plan; custom footprints can be entered either way.
  if(base.reduce((s,p,i)=>s+p.x*base[(i+1)%base.length].z-base[(i+1)%base.length].x*p.z,0)<0)base.reverse();
  const material=o.style==='glass'?0:o.style==='brick'||o.style==='terracotta'?6:o.style==='stone'?5:o.style==='white'?7:0;
  const roofHeight=o.roof==='flat'?0:Math.min(o.height*.22,Math.min(o.width,o.depth)*.35);
  const wallHeight=o.height-roofHeight;
  const ring=(t:number,y=wallHeight*t,scaleExtra=1):Vec3[]=>{
    let scale=1-o.taper*t,angle=o.twist*t,dx=0,dz=0;
    if(o.sections.length){
      const i=Math.min(o.sections.length-2,Math.max(0,o.sections.findIndex(s=>s.at>=t)-1));const a=o.sections[i],b=o.sections[i+1],u=(t-a.at)/(b.at-a.at);
      scale=a.scale+(b.scale-a.scale)*u;angle=a.rotation+(b.rotation-a.rotation)*u;dx=a.offsetX+(b.offsetX-a.offsetX)*u;dz=a.offsetZ+(b.offsetZ-a.offsetZ)*u;
    }
    const theta=(angle+o.rotation)*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
    return base.map(p=>{const x=(p.x-o.width/2)*scale*scaleExtra,z=(p.z-o.depth/2)*scale*scaleExtra;return {x:o.x+o.width/2+x*c-z*s+dx,y:o.y+y,z:o.z+o.depth/2+x*s+z*c+dz};});
  };
  const segments=Math.min(o.floors,80);
  const bottom=ring(0), top=ring(1);
  const triangulate=(points:Vec3[],color:number,reverse=false)=>{
    const triangles=ShapeUtils.triangulateShape(base.map(p=>new Vector2(p.x,p.z)),[]);
    for(const tri of triangles)writer.face((reverse?[...tri].reverse():tri).map(i=>points[i]),color);
  };
  triangulate(bottom,material); // footprint caps use concave-aware triangulation
  for(let f=0;f<segments;f++){
    const a=ring(f/segments),b=ring((f+1)/segments);
    for(let j=0;j<base.length;j++){
      const k=(j+1)%base.length;
      writer.quad(a[j],b[j],b[k],a[k],material);
      if(o.detail>=2){
        const edge=Math.hypot(a[k].x-a[j].x,a[k].z-a[j].z);
        const bays=Math.max(1,Math.min(base.length>8?1:6,Math.round(edge/3)));
        for(let bay=0;bay<bays;bay++){
          const u0=(bay+.13)/bays,u1=(bay+.87)/bays;
          // Raise glazing slightly off the wall; triangles also support twisting facades.
          const nx=(a[k].z-a[j].z)/Math.max(edge,.001)*.035,nz=-(a[k].x-a[j].x)/Math.max(edge,.001)*.035;
          const panel=(u:number,v:number)=>{const p=mix(mix(a[j],a[k],u),mix(b[j],b[k],u),v);return {...p,x:p.x+nx,z:p.z+nz};};
          writer.quad(panel(u0,.18),panel(u0,.82),panel(u1,.82),panel(u1,.18),1);
        }
      }
      if(o.detail===3){
        const band0=mix(a[j],b[j],.03),band1=mix(a[k],b[k],.03);
        writer.quad({...a[j],x:a[j].x+(a[j].x-o.x-o.width/2)*.001},band0,band1,{...a[k],x:a[k].x+(a[k].x-o.x-o.width/2)*.001},2);
      }
    }
  }
  if(o.roof==='flat')triangulate(top,3,true);
  else if(o.roof==='dome'){
    let previous=top;
    for(let r=1;r<=6;r++){
      const theta=r/6*Math.PI/2;
      const next=ring(1,wallHeight+roofHeight*Math.sin(theta),Math.max(.001,Math.cos(theta)));
      for(let j=0;j<base.length;j++)writer.quad(previous[j],next[j],next[(j+1)%base.length],previous[(j+1)%base.length],3);
      previous=next;
    }
    triangulate(previous,3,true);
  }else if(o.roof==='gable'&&o.shape==='rectangle'){
    const ridgeA=mix(top[0],top[1],.5),ridgeB=mix(top[3],top[2],.5);ridgeA.y+=roofHeight;ridgeB.y+=roofHeight;
    writer.face([top[0],ridgeA,top[1]],material);writer.face([top[3],top[2],ridgeB],material);
    writer.quad(top[0],top[3],ridgeB,ridgeA,3);writer.quad(top[1],ridgeA,ridgeB,top[2],3);
  }else{
    const center=top.reduce((p,v)=>({x:p.x+v.x/top.length,y:o.y+o.height,z:p.z+v.z/top.length}),{x:0,y:o.y+o.height,z:0});
    // Hipped roofs have a raised smaller ring; pyramid/spire converge to an apex.
    if(o.roof==='hip'){
      const upper=top.map(p=>({...mix(p,center,.45),y:o.y+o.height}));
      for(let j=0;j<base.length;j++)writer.quad(top[j],upper[j],upper[(j+1)%base.length],top[(j+1)%base.length],3);
      triangulate(upper,3,true);
    }else for(let j=0;j<base.length;j++)writer.face([top[j],center,top[(j+1)%base.length]],3);
  }
  if(writer.mesh.faces.length>16000)throw new Error('This design exceeds the detail budget. Reduce floors, footprint points or detail.');
  return writer.mesh;
}
function commitMeshes(api:IModelAPI,meshes:ArchitectureMesh[],label:string){
  const count=meshes.reduce((sum,m)=>sum+m.faces.length,0);
  if(count>50000)throw new Error('This scene is too detailed. Use fewer buildings or a lower detail level.');
  const faces:string[]=[];
  api.batch(label,()=>{
    for(const mesh of meshes){
      const result=api.importGeometry(mesh.vertices,mesh.faces);
      if(result.faceIds.length!==mesh.faces.length)throw new Error('Some generated faces were invalid; the operation was rolled back.');
      for(let c=0;c<COLORS.length;c++){const ids=result.faceIds.filter((_,i)=>mesh.colors[i]===c);if(ids.length)api.setFaceColor(ids,...COLORS[c] as [number,number,number]);}
      faces.push(...result.faceIds);
    }
  });
  return faces;
}
const latest=new WeakMap<IModelAPI,{options:BuildingOptions; layers:string[][]; anchor:Vec3[][]}>();
export function createBuilding(api:IModelAPI,input:Record<string,unknown>){
  const options=buildingOptions(input),mesh=buildingMesh(options),faces=commitMeshes(api,[mesh],'Create building');
  latest.set(api,{options,layers:[faces],anchor:faces.map(id=>api.getFaceInfo(id)!.vertices)});
  return {ok:true,created:{faces},summary:`Created a ${options.shape.replace('_','-')} ${options.type}: ${options.width} × ${options.depth} m, ${options.height} m tall, ${options.floors} floors, ${options.roof} roof, ${options.style} facade${options.twist?`, ${options.twist}° twist`:''}${options.taper?`, ${Math.round(options.taper*100)}% taper`:''}${options.city?`. Inspired by ${CITY[options.city as keyof typeof CITY].label}; not a map reconstruction`:''}. Detail ${options.detail}/3.${options.floors>80?' Facade simplified to 80 window rows for performance.':''} Undo reverses this building.`};
}
export function createCity(api:IModelAPI,raw:Record<string,unknown>){
  const parsed=typeof raw.brief==='string'?architectureBrief(raw.brief):{};
  const countMatch=typeof raw.brief==='string'?raw.brief.match(/\b(\d+)\s+buildings?\b/i):null;
  const input:Record<string,unknown>={...raw,...(typeof raw.brief==='string'?{city:parsed.city||''}:{}),...(countMatch?{count:Number(countMatch[1])}:{}),...(parsed.detail?{detail:parsed.detail}:{})};
  if(typeof raw.brief==='string'){
    const seed=raw.brief.match(/\bseed\s*[:=]?\s*(\d+)\b/i);
    if(seed)input.seed=Number(seed[1]);else delete input.seed;
  }
  const key=cityKey(input.city),regional=key?CITY[key]:CITY.new_york;
  if(input.city&&!key)throw new Error('Choose a supported city inspiration: '+Object.values(CITY).map(c=>c.label).join(', ')+'.');
  const count=numeric(input,'count',9,1,25,true),spacing=numeric(input,'spacing',18,8,100),seed=numeric(input,'seed',Math.floor(Math.random()*2147483647),0,2147483647,true),detail=numeric(input,'detail',2,1,3,true);
  let rng=seed;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const x=numeric(input,'x',0,-100000,100000),z=numeric(input,'z',0,-100000,100000),columns=Math.ceil(Math.sqrt(count)),plot=Math.max(regional.width,regional.depth)*1.45;
  const meshes:ArchitectureMesh[]=[],designs:BuildingOptions[]=[];
  for(let i=0;i<count;i++){
    const variation=random(),floors=Math.max(1,Math.round(regional.floors*(.35+variation*.95)));
    const shape=key==='paris'?(i%3===0?'u_shape':'rectangle'):key==='dubai'?['ellipse','circle','hexagon','rectangle'][i%4]:['rectangle','l_shape','rectangle','u_shape'][i%4];
    const o=buildingOptions({type:floors>18?'skyscraper':floors>3?'apartment':'house',city:key||undefined,floors,height:floors*3.4,width:regional.width*(.7+random()*.45),depth:regional.depth*(.7+random()*.45),shape,roof:regional.roof,style:regional.style,detail,x:x+(i%columns)*(plot+spacing)+plot*.1,z:z+Math.floor(i/columns)*(plot+spacing)+plot*.1,twist:key==='dubai'&&i%3===0?30:0,taper:key==='dubai'?.25:0});
    designs.push(o);meshes.push(buildingMesh(o));
  }
  const street=new MeshWriter(),rows=Math.ceil(count/columns),w=columns*(plot+spacing),d=rows*(plot+spacing);
  street.face([{x:x-spacing/2,y:-.08,z:z-spacing/2},{x:x-spacing/2,y:-.08,z:z+d},{x:x+w,y:-.08,z:z+d},{x:x+w,y:-.08,z:z-spacing/2}],8);
  for(let i=0;i<count;i++){
    const px=x+(i%columns)*(plot+spacing),pz=z+Math.floor(i/columns)*(plot+spacing);
    street.face([{x:px,y:-.02,z:pz},{x:px,y:-.02,z:pz+plot},{x:px+plot,y:-.02,z:pz+plot},{x:px+plot,y:-.02,z:pz}],2);
  }
  meshes.push(street.mesh);const faces=commitMeshes(api,meshes,'Create city block');latest.delete(api);
  return {ok:true,created:{faces},summary:`Created ${count} varied buildings with streets and sidewalks${key?`, inspired by ${regional.label}`:''}. Heights ${Math.min(...designs.map(o=>o.height)).toFixed(1)}–${Math.max(...designs.map(o=>o.height)).toFixed(1)} m. Seed ${seed}; detail ${detail}/3. This is a fictional city-inspired layout, not actual map data. Undo reverses the entire block.`};
}

export function detailBuilding(api:IModelAPI){
  const record=latest.get(api);
  if(!record)throw new Error('Create an individual building first. City blocks use the requested detail level at creation.');
  if(record.layers[0].some((id,i)=>JSON.stringify(api.getFaceInfo(id)?.vertices)!==JSON.stringify(record.anchor[i])))throw new Error('The building was moved, edited or undone. Undo those changes before adding detail.');
  let level=record.options.detail;
  let used=1;
  while(used<record.layers.length&&record.layers[used].every(id=>!!api.getFaceInfo(id))){level++;used++;}
  if(record.layers.slice(used).some(ids=>ids.some(id=>!!api.getFaceInfo(id))))throw new Error('Some detail geometry was edited. Undo those changes first.');
  if(level>=3)throw new Error('This building already has detail level 3. Try a new shape, roof or city-inspired design.');
  const options={...record.options,detail:level+1};
  const mesh=buildingMesh(options), targetColor=level===1?1:2;
  const faces=mesh.faces.filter((_,i)=>mesh.colors[i]===targetColor);
  const ids=commitMeshes(api,[{...mesh,faces,colors:faces.map(()=>targetColor)}],'Add building detail');
  record.layers=record.layers.slice(0,used);record.layers.push(ids);
  return {ok:true,created:{faces:ids},summary:`Added ${level===1?'window panels':'floor-band details'} to the ${options.shape.replace('_','-')} ${options.type}. Detail ${options.detail}/3. Undo reverses this detail pass.`};
}
