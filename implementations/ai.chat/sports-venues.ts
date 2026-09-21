// @archigraph ai.chat
import type { ArchitectureMesh, BuildingOptions } from './architecture';
import type { Vec3 } from '../../src/core/types';

/** Concept proportions only; these are not certified competition layouts. */
export const SPORTS = [
  ['soccer','stadium',105,68,'grass','football|association football|futsal'],
  ['american football','stadium',110,49,'grass','gridiron|nfl'],
  ['rugby','stadium',120,70,'grass','rugby union|rugby league'],
  ['baseball','stadium',110,110,'diamond','ballpark'],
  ['softball','stadium',85,85,'diamond',''],
  ['cricket','stadium',150,130,'oval',''],
  ['australian football','stadium',160,130,'oval','aussie rules|afl'],
  ['gaelic football','stadium',140,85,'grass','hurling|camogie'],
  ['lacrosse','stadium',100,55,'grass',''],
  ['field hockey','stadium',91,55,'grass',''],
  ['athletics','stadium',170,95,'track','track and field|running'],
  ['basketball','arena',28,15,'court','nba'],
  ['ice hockey','arena',60,30,'ice','hockey|nhl'],
  ['tennis','arena',36,18,'court',''],
  ['volleyball','arena',24,15,'court',''],
  ['beach volleyball','stadium',24,16,'sand',''],
  ['handball','arena',40,20,'court',''],
  ['netball','arena',31,16,'court',''],
  ['badminton','arena',18,10,'court',''],
  ['pickleball','arena',18,10,'court',''],
  ['table tennis','arena',14,7,'court','ping pong'],
  ['swimming','arena',50,25,'water','aquatics|water polo|diving'],
  ['boxing','arena',8,8,'mat','combat sports|mma|wrestling|judo|karate|taekwondo'],
  ['gymnastics','arena',40,30,'mat',''],
  ['figure skating','arena',60,30,'ice','speed skating|curling'],
  ['cycling','arena',100,65,'track','velodrome'],
  ['equestrian','stadium',90,60,'sand','rodeo|show jumping|dressage'],
  ['motorsport','stadium',180,110,'track','racing|speedway'],
  ['esports','arena',30,20,'mat','e sports'],
  ['multi sport','stadium',100,60,'grass','multisport|multi purpose|custom sport'],
] as const;
export type Sport = typeof SPORTS[number];
const normalized=(s:string)=>s.toLowerCase().replace(/[_-]/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export function findSport(text:string):Sport|undefined {
  const value=` ${normalized(text)} `;
  return SPORTS.flatMap(s=>[s[0],...s[5].split('|').filter(Boolean)].map(alias=>({s,alias})))
    .filter(({alias})=>value.includes(` ${alias} `)).sort((a,b)=>b.alias.length-a.alias.length)[0]?.s;
}
export function sportsMesh(o:BuildingOptions):ArchitectureMesh {
  const mesh:ArchitectureMesh={vertices:[],faces:[],colors:[]};
  const angle=o.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const point=(x:number,y:number,z:number):Vec3=>({x:o.x+o.width/2+x*c-z*s,y:o.y+y,z:o.z+o.depth/2+x*s+z*c});
  const face=(p:Vec3[],color:number)=>{const i=mesh.vertices.length;mesh.vertices.push(...p);mesh.faces.push(p.map((_,j)=>i+j));mesh.colors.push(color);};
  const ring=(w:number,d:number,y:number)=>[point(-w/2,y,-d/2),point(w/2,y,-d/2),point(w/2,y,d/2),point(-w/2,y,d/2)];
  const join=(a:Vec3[],b:Vec3[],color:number)=>{for(let i=0;i<a.length;i++){const j=(i+1)%a.length;face([a[i],b[i],b[j],a[j]],color);}};
  const w=o.width*.62,d=o.depth*.62,h=o.roof==='open'?o.height:o.height*.8;
  const surface=SPORTS.find(s=>[s[0],...s[5].split('|')].some(name=>name&&normalized(name)===normalized(o.sport??'')))?.[4]??'grass';
  const color=surface==='ice'?2:surface==='water'?1:surface==='grass'||surface==='oval'||surface==='diamond'?4:surface==='track'?8:5;
  face(ring(w,d,0).reverse(),color);
  // Fixed base rows ensure later detail passes add geometry without replacing it.
  const material=o.style==='brick'||o.style==='terracotta'?6:o.style==='stone'?5:o.style==='white'?7:0;
  const rows=12;
  for(let i=0;i<rows;i++){
    const t=i/rows,u=(i+1)/rows;
    const a=ring(w+(o.width-w)*t,d+(o.depth-d)*t,h*t);
    const b=ring(w+(o.width-w)*u,d+(o.depth-d)*u,h*t);
    const upper=ring(w+(o.width-w)*u,d+(o.depth-d)*u,h*u);
    join(a,b,i%2?2:material);join(b,upper,material);
  }
  join(ring(o.width,o.depth,0),ring(o.width,o.depth,h),material);
  if(o.roof!=='open'){
    const outer=ring(o.width,o.depth,h);
    if(o.type==='arena'){
      if(o.roof==='flat'){const top=ring(o.width,o.depth,o.height);join(outer,top,material);face(top.reverse(),3);}
      else if(o.roof==='dome'){
        let lower=outer;
        for(let i=1;i<=8;i++){const t=i/8*Math.PI/2,scale=Math.max(.01,Math.cos(t));const upper=ring(o.width*scale,o.depth*scale,h+(o.height-h)*Math.sin(t));join(lower,upper,3);lower=upper;}
        face(lower.reverse(),3);
      }
      else {const apex=point(0,o.height,0);for(let i=0;i<4;i++)face([outer[i],apex,outer[(i+1)%4]],3);}
    }else join(outer,ring(o.width*.78,o.depth*.78,o.height),3);
  }
  const rectangle=(x:number,z:number,rw:number,rd:number,y:number,col:number)=>face([point(x,y,z),point(x,y,z+rd),point(x+rw,y,z+rd),point(x+rw,y,z)],col);
  if(o.detail>=2){
    const y=o.height*.001,line=Math.min(w,d)*.004;
    if(['oval','track','ice'].includes(surface)){
      const ellipse=(scale:number)=>Array.from({length:48},(_,i)=>point(w*.47*scale*Math.cos(i*Math.PI/24),y,d*.47*scale*Math.sin(i*Math.PI/24)));
      join(ellipse(1),ellipse(.97),2);
      if(surface==='track')join(ellipse(.93),ellipse(.90),2);
    }else if(surface==='diamond'){
      face([point(0,y,d*.35),point(w*.3,y,0),point(0,y,-d*.35),point(-w*.3,y,0)],5);
    }else{
      rectangle(-w*.45,-d*.45,w*.9,line,y,2);rectangle(-w*.45,d*.45-line,w*.9,line,y,2);
      rectangle(-w*.45,-d*.45,line,d*.9,y,2);rectangle(w*.45-line,-d*.45,line,d*.9,y,2);
      rectangle(-line/2,-d*.45,line,d*.9,y,2);
      if(surface==='water')for(let i=1;i<8;i++)rectangle(-w*.45,-d*.45+d*.9*i/8,w*.9,line,y,2);
    }
  }
  if(o.detail===3){
    // Seat strips and scoreboards stay inside the requested envelope.
    for(let i=0;i<rows;i++){
      const t=(i+.45)/rows,u=(i+.7)/rows,y=h*i/rows+o.height*.002;
      join(ring(w+(o.width-w)*t,d+(o.depth-d)*t,y),ring(w+(o.width-w)*u,d+(o.depth-d)*u,y),1);
    }
    for(const sign of [-1,1])face([point(sign*o.width*.49,h*.6,-d*.18),point(sign*o.width*.49,h*.9,-d*.18),point(sign*o.width*.49,h*.9,d*.18),point(sign*o.width*.49,h*.6,d*.18)],8);
  }
  return mesh;
}
