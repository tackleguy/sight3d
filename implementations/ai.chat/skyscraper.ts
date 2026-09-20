import type { IModelAPI } from '../api.model/ModelAPI';
import type { Vec3 } from '../../src/core/types';

type Options = { floors:number; width:number; depth:number; floorHeight:number; setbacks:number; detail:number; style:'glass'|'art_deco'; x:number; y:number; z:number };
type Mesh = { vertices:Vec3[]; faces:number[][]; colors:number[] };
const palette = [[0.22,0.28,0.32],[0.22,0.53,0.66],[0.73,0.77,0.78],[0.83,0.73,0.52],[0.16,0.22,0.25]];
export function skyscraperOptions(input:Record<string,unknown>):Options {
  const number = (key:string, fallback:number, min:number, max:number, integer=false) => {
    const value=input[key] ?? fallback;
    if(typeof value !== 'number' || !Number.isFinite(value) || value<min || value>max || (integer && !Number.isInteger(value))) throw new Error(`${key} must be ${integer?'an integer':'a number'} from ${min} to ${max}.`);
    return value;
  };
  const style=input.style ?? 'glass';
  if(style!=='glass' && style!=='art_deco') throw new Error('style must be glass or art_deco.');
  return {floors:number('floors',48,8,100,true),width:number('width',30,12,100),depth:number('depth',24,12,100),floorHeight:number('floorHeight',3.6,2.5,6),setbacks:number('setbacks',3,0,5,true),detail:number('detail',2,1,3,true),style,x:number('x',0,-10000,10000),y:number('y',0,-10000,10000),z:number('z',0,-10000,10000)};
}
/** Separate geometry layers allow later detail additions without rebuilding the tower. */
export function skyscraperMesh(o:Options, level:number):Mesh {
  const mesh:Mesh={vertices:[],faces:[],colors:[]};
  const quad=(points:number[][],color:number)=>{const n=mesh.vertices.length;mesh.vertices.push(...points.map(([x,y,z])=>({x:x+o.x,y:y+o.y,z:z+o.z})));mesh.faces.push([n,n+1,n+2,n+3]);mesh.colors.push(color);};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:number)=>{
    quad([[x,y,z],[x,y+h,z],[x+w,y+h,z],[x+w,y,z]],c);
    quad([[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]],c);
    quad([[x,y,z],[x,y,z+d],[x,y+h,z+d],[x,y+h,z]],c);
    quad([[x+w,y,z],[x+w,y+h,z],[x+w,y+h,z+d],[x+w,y,z+d]],c);
    quad([[x,y+h,z],[x,y+h,z+d],[x+w,y+h,z+d],[x+w,y+h,z]],c);
    quad([[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],c);
  };
  const h=o.floors*o.floorHeight, podiumH=o.floorHeight*2;
  const section=(floor:number)=>{
    const tier=Math.min(o.setbacks,Math.floor(floor/o.floors*(o.setbacks+1)));
    const scale=1-tier*0.105;
    return {x:o.width*(1-scale)/2,z:o.depth*(1-scale)/2,w:o.width*scale,d:o.depth*scale};
  };
  const stone=o.style==='art_deco'?3:0;
  if(level===1){
    box(-3,0,-3,o.width+6,podiumH,o.depth+6,stone);
    for(let tier=0;tier<=o.setbacks;tier++){
      const first=Math.ceil(tier*o.floors/(o.setbacks+1)), end=Math.ceil((tier+1)*o.floors/(o.setbacks+1));
      const s=section(first);
      box(s.x,podiumH+first*o.floorHeight,s.z,s.w,(end-first)*o.floorHeight,s.d,stone);
    }
    const top=section(o.floors-1);
    box(top.x+top.w*.2,podiumH+h,top.z+top.d*.2,top.w*.6,o.floorHeight*2,top.d*.6,stone);
    // Faceted tapered crown, not another rectangular block.
    const y=podiumH+h+o.floorHeight*2, cx=o.width/2, cz=o.depth/2, r=Math.min(top.w,top.d)*.25;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4,n=mesh.vertices.length;
      mesh.vertices.push({x:o.x+cx+Math.cos(a)*r,y:o.y+y,z:o.z+cz+Math.sin(a)*r},{x:o.x+cx,y:o.y+y+o.floorHeight*4,z:o.z+cz},{x:o.x+cx+Math.cos(b)*r,y:o.y+y,z:o.z+cz+Math.sin(b)*r});mesh.faces.push([n,n+1,n+2]);mesh.colors.push(2);
    }
  }
  if(level===2){
    for(let f=0;f<o.floors;f++){
      const s=section(f), y=podiumH+f*o.floorHeight;
      const baysX=Math.min(12,Math.max(3,Math.round(s.w/3))), baysZ=Math.min(12,Math.max(3,Math.round(s.d/3)));
      // Individual inset-looking glass panels on all four elevations.
      for(let b=0;b<baysX;b++){
        const x=s.x+(b+.13)*s.w/baysX,w=.74*s.w/baysX, y0=y+.45,y1=y+o.floorHeight-.45;
        quad([[x,y0,s.z-.03],[x,y1,s.z-.03],[x+w,y1,s.z-.03],[x+w,y0,s.z-.03]],1);
        quad([[x,y0,s.z+s.d+.03],[x+w,y0,s.z+s.d+.03],[x+w,y1,s.z+s.d+.03],[x,y1,s.z+s.d+.03]],1);
      }
      for(let b=0;b<baysZ;b++){
        const z=s.z+(b+.13)*s.d/baysZ,d=.74*s.d/baysZ,y0=y+.45,y1=y+o.floorHeight-.45;
        quad([[s.x-.03,y0,z],[s.x-.03,y0,z+d],[s.x-.03,y1,z+d],[s.x-.03,y1,z]],1);
        quad([[s.x+s.w+.03,y0,z],[s.x+s.w+.03,y1,z],[s.x+s.w+.03,y1,z+d],[s.x+s.w+.03,y0,z+d]],1);
      }
      box(s.x-.12,y,s.z-.12,s.w+.24,.16,s.d+.24,2);
    }
  }
  if(level===3){
    for(let tier=0;tier<=o.setbacks;tier++){
      const first=Math.ceil(tier*o.floors/(o.setbacks+1)),end=Math.ceil((tier+1)*o.floors/(o.setbacks+1)),s=section(first),y=podiumH+first*o.floorHeight,height=(end-first)*o.floorHeight;
      for(let b=0;b<=6;b++){
        box(s.x+b*s.w/6-.10,y,s.z-.28,.2,height,.3,2);
        box(s.x+b*s.w/6-.10,y,s.z+s.d-.02,.2,height,.3,2);
        box(s.x-.28,y,s.z+b*s.d/6-.10,.3,height,.2,2);
        box(s.x+s.w-.02,y,s.z+b*s.d/6-.10,.3,height,.2,2);
      }
      // Terrace parapets at each setback roof.
      const roof=podiumH+end*o.floorHeight;
      box(s.x,roof,s.z,s.w,.8,.22,2);box(s.x,roof,s.z+s.d-.22,s.w,.8,.22,2);
      box(s.x,roof,s.z,.22,.8,s.d,2);box(s.x+s.w-.22,roof,s.z,.22,.8,s.d,2);
    }
    // Recessed-looking lobby glazing, canopy, columns, entrance steps and plaza.
    box(o.width*.25,.2,-3.03,o.width*.5,podiumH-.4,.08,1);
    box(o.width*.2,podiumH*.65,-6,o.width*.6,.25,4,2);
    for(const x of [o.width*.2,o.width*.8-.25])box(x,0,-5.5,.25,podiumH*.65,.25,2);
    box(-6,-.3,-9,o.width+12,.3,o.depth+15,4);
    for(let i=0;i<3;i++)box(o.width*.25,i*.15,-7+i*.6,o.width*.5,.15,.6,2);
    const top=section(o.floors-1);
    for(let i=0;i<3;i++)box(top.x+.6+i*1.8,podiumH+h+.1,top.z+.7,1.2,1.1,1.5,4);
  }
  return mesh;
}

type RecordEntry={options:Options; layers:string[][]; anchor:Vec3[][]};
const towers=new WeakMap<IModelAPI,RecordEntry>();
export function buildSkyscraper(api:IModelAPI,input:Record<string,unknown>,refine=false){
  const previous=towers.get(api);
  if(refine && !previous) throw new Error('Create a skyscraper first. Add detail works on the most recent tower created in this session.');
  const o=refine?{...previous!.options}:skyscraperOptions(input);
  let from=1;
  if(refine){
    const base=previous!.layers[0];
    if(base.some((id,i)=>JSON.stringify(api.getFaceInfo(id)?.vertices)!==JSON.stringify(previous!.anchor[i]))) throw new Error('The tower was moved, edited or undone. Undo those edits before adding detail, or create a new tower.');
    from=2;
    while(from<=3 && previous!.layers[from-1]?.every(id=>!!api.getFaceInfo(id)))from++;
    if(from>3)throw new Error('This tower already has maximum detail: windows, floor bands, fins, terraces, lobby and roof equipment.');
    if(previous!.layers.slice(from-1).some(ids=>ids.some(id=>!!api.getFaceInfo(id))))throw new Error('Some detail geometry was edited. Undo those edits before adding the next level.');
    o.detail=from;
  }
  const layers=refine?previous!.layers.slice(0,from-1):[];
  const created:string[]=[];
  api.batch(refine?'Add skyscraper detail':'Create skyscraper',()=>{
    for(let level=from;level<=o.detail;level++){
      const mesh=skyscraperMesh(o,level), result=api.importGeometry(mesh.vertices,mesh.faces);
      for(let c=0;c<palette.length;c++){
        const faces=result.faceIds.filter((_,i)=>mesh.colors[i]===c);
        if(faces.length) api.setFaceColor(faces,palette[c][0],palette[c][1],palette[c][2]);
      }
      layers[level-1]=result.faceIds;created.push(...result.faceIds);
    }
  });
  towers.set(api,{options:o,layers,anchor:layers[0].map(id=>api.getFaceInfo(id)!.vertices)});
  return {ok:true,created:{faces:created},summary:`${refine?'Added detail to':'Created'} a ${o.floors}-floor ${o.style==='glass'?'glass':'Art Deco'} skyscraper, ${o.width} × ${o.depth} m footprint, ${o.setbacks} setbacks, detail ${o.detail}/3. ${o.detail===1?'Podium, tiered tower and tapered crown.':o.detail===2?'Individual windows and floor bands on all four sides.':'Façade fins, terrace parapets, entrance canopy, columns, plaza and rooftop equipment.'} ${o.detail<3?'Ask “add more detail” for the next level.':''} Undo reverses this operation.`};
}
