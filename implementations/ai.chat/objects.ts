import type { IModelAPI } from '../api.model/ModelAPI';
import type { Color, Vec3 } from '../../src/core/types';

export const OBJECT_TYPES = ['sphere', 'cylinder', 'cone', 'torus', 'arc', 'glass_of_water', 'table', 'chair', 'water'] as const;
export const SURFACES = {
  solid: { color: '#8fa8bd', opacity: 1, roughness: .55, metalness: 0 },
  glass: { color: '#c4e9f5', opacity: .24, roughness: .04, metalness: 0 },
  water: { color: '#268fbf', opacity: .55, roughness: .08, metalness: 0 },
  metal: { color: '#adb7c2', opacity: 1, roughness: .24, metalness: .85 },
  wood: { color: '#96633d', opacity: 1, roughness: .75, metalness: 0 },
};
const COLORS: Record<string,string> = { red:'#e34b47', orange:'#ed943b', yellow:'#edcb4a', green:'#489d66', blue:'#387acc', purple:'#8e60b8', pink:'#e281ad', white:'#f1f3f5', black:'#24282f', gray:'#888e96', grey:'#888e96', brown:'#96633d', cyan:'#33bdcc' };
export function surfaceOptions(input:Record<string,unknown>) {
  const name = input.material ?? 'solid';
  if (typeof name !== 'string' || !Object.hasOwn(SURFACES,name)) throw new Error('Choose solid, glass, water, metal or wood.');
  const surface = SURFACES[name as keyof typeof SURFACES];
  const raw = input.color ?? surface.color;
  if (typeof raw !== 'string') throw new Error('Color must be a name or #RRGGBB.');
  const value=raw.trim();
  const hex = COLORS[value.toLowerCase()] || (/^#[0-9a-f]{3}$/i.test(value)?'#'+[...value.slice(1)].map(c=>c+c).join(''):value);
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Use a basic color name or #RRGGBB.');
  const color:Color = {r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255};
  return { name:`${name} ${hex}`, color, opacity:surface.opacity, roughness:surface.roughness, metalness:surface.metalness };
}
export function paintObject(api:IModelAPI,input:Record<string,unknown>) {
  const surface = surfaceOptions(input);
  const ids = input.faceIds ?? api.getSelectedEntities().faces;
  if (!Array.isArray(ids) || !ids.length || !ids.every(id=>typeof id==='string' && api.getFaceInfo(id))) throw new Error('Select faces to paint, or supply valid faceIds.');
  api.batch('Apply surface',()=>{const id=api.createMaterial(surface.name,surface.color,surface);api.setFaceMaterial(ids,id);});
  return {ok:true,updated:{faces:ids},summary:`Applied ${surface.name} to ${ids.length} faces.`};
}
function number(input:Record<string,unknown>,key:string,fallback:number,min:number,max:number) {
  const value=input[key]??fallback;
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`${key} must be between ${min} and ${max}.`);
  return value;
}
/** Closed surfaces of revolution, with shared pole vertices and explicit winding. */
function lathe(profile:Array<[number,number]>,segments:number,origin:Vec3) {
  const vertices:Vec3[]=[],faces:number[][]=[];
  const rings=profile.map(([r,y])=>Array.from({length:r===0?1:segments},(_,i)=>{
    const angle=i/segments*Math.PI*2;
    vertices.push({x:origin.x+r*Math.cos(angle),y:origin.y+y,z:origin.z+r*Math.sin(angle)});return vertices.length-1;
  }));
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
    const a=rings[j],b=rings[j+1],k=(i+1)%segments;
    const face=[a[i%a.length],b[i%b.length],b[k%b.length],a[k%a.length]];
    const unique=[...new Set(face)];if(unique.length>=3)faces.push(unique);
  }
  return {vertices,faces};
}
export function objectOptions(input:Record<string,unknown>) {
  const type=input.type;
  if(!OBJECT_TYPES.includes(type as any))throw new Error(`Choose ${OBJECT_TYPES.join(', ')}.`);
  const drinking=type==='glass_of_water';
  const r=number(input,'radius',drinking?.04:1,.001,1000),h=number(input,'height',drinking?.12:2,.001,2000);
  const width=number(input,'width',2,.001,2000),depth=number(input,'depth',1,.001,2000);
  const origin={x:number(input,'x',0,-1e6,1e6),y:number(input,'y',0,-1e6,1e6),z:number(input,'z',0,-1e6,1e6)};
  const segments=number(input,'segments',32,8,128);
  if(!Number.isInteger(segments))throw new Error('segments must be an integer.');
  const angle=number(input,'angle',180,1,360),tube=number(input,'thickness',r*.15,.00001,r*.95);
  const fill=number(input,'fill',.72,.01,.95);
  const surface=surfaceOptions({...input,material:input.material??(type==='water'?'water':drinking?'glass':'solid')});
  return {type,r,h,width,depth,origin,segments,angle,tube,fill,surface};
}
export function createObject(api:IModelAPI,input:Record<string,unknown>) {
  const {type,r,h,width,depth,origin,segments,angle,tube,fill,surface}=objectOptions(input);
  const faces:string[]=[];
  api.batch(`Create ${String(type).replace(/_/g,' ')}`,()=>{
    const material=api.createMaterial(surface.name,surface.color,surface);
    const collect=(ids:string[],mat=material)=>{api.setFaceMaterial(ids,mat);faces.push(...ids);};
    const mesh=(data:{vertices:Vec3[];faces:number[][]},mat=material)=>{const result=api.importGeometry(data.vertices,data.faces);if(result.faceIds.length!==data.faces.length)throw new Error('Invalid generated geometry; operation rolled back.');collect(result.faceIds,mat);};
    const box=(x:number,y:number,z:number,w:number,d:number,t:number)=>collect(api.createBox({x:origin.x+x,y:origin.y+y,z:origin.z+z},w,d,t).faceIds);
    if(type==='sphere'){
      const rings=Math.max(8,Math.floor(segments/2));
      mesh(lathe(Array.from({length:rings+1},(_,i)=>[i===0||i===rings?0:r*Math.sin(i/rings*Math.PI),r-r*Math.cos(i/rings*Math.PI)] as [number,number]),segments,origin));
    }
    else if(type==='cylinder')mesh(lathe([[0,0],[r,0],[r,h],[0,h]],segments,origin));
    else if(type==='cone')mesh(lathe([[0,0],[r,0],[0,h]],segments,origin));
    else if(type==='glass_of_water') {
      const wall=Math.min(r*.09,h*.06);
      mesh(lathe([[0,0],[r,0],[r,h],[r-wall,h],[r-wall,wall],[0,wall]],segments,origin));
      const water=surfaceOptions({material:'water'}),id=api.createMaterial(water.name,water.color,water);
      mesh(lathe([[0,wall*1.05],[r-wall*1.1,wall*1.05],[r-wall*1.1,wall+(h-wall)*fill],[0,wall+(h-wall)*fill]],segments,origin),id);
    } else if(type==='water')box(0,0,0,width,depth,h);
    else if(type==='table'||type==='chair') {
      const leg=Math.min(width,depth,h)*.09,seat=type==='chair'?h*.48:h-leg;
      box(0,seat,0,width,depth,leg);
      for(const x of [0,width-leg])for(const z of [0,depth-leg])box(x,0,z,leg,leg,seat);
      if(type==='chair')box(0,seat+leg,depth-leg,width,leg,h-seat-leg);
    } else {
      // Tubular arc in the vertical XY plane; a torus closes the same path.
      const closed=type==='torus'||angle===360,sweep=(closed?360:angle)*Math.PI/180,sides=12;
      const vertices:Vec3[]=[],polygons:number[][]=[];
      for(let i=0;i<(closed?segments:segments+1);i++)for(let j=0;j<sides;j++){
        const a=i/segments*sweep,b=j/sides*Math.PI*2,rad=r+tube*Math.cos(b);
        vertices.push({x:origin.x+rad*Math.cos(a),y:origin.y+r+tube+rad*Math.sin(a),z:origin.z+tube*Math.sin(b)});
      }
      for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
        const k=(i+1)%(closed?segments:segments+1),n=(j+1)%sides;
        polygons.push([i*sides+j,k*sides+j,k*sides+n,i*sides+n]);
      }
      if(!closed){polygons.push(Array.from({length:sides},(_,j)=>j).reverse());polygons.push(Array.from({length:sides},(_,j)=>segments*sides+j));}
      mesh({vertices,faces:polygons});
    }
  });
  return {ok:true,created:{faces},summary:`Created ${String(type).replace(/_/g,' ')} with ${faces.length} faces. Undo reverses this model.`};
}
