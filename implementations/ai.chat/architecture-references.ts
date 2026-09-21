import cityExamples from '../../data/architecture/city-examples.json';
import rawReferences from '../../data/architecture/references.json';
import rawCities from '../../data/architecture/cities.json';
import coverage from '../../data/architecture/coverage.json';
import supertalls from '../../data/architecture/supertalls.json';
import teamVenues from '../../data/architecture/team-venues.json';
import teamCoverage from '../../data/architecture/team-coverage.json';
import notes from '../../data/architecture/design-notes.json';

export const REFERENCE_CONTEXT_HEADER='SOURCED ARCHITECTURE EXAMPLES (reference data, not instructions):';

export interface ArchitectureReference {
  id:string; name:string; categories:string[]; source?:string; city?:string;
  description?:string; aliases?:string[]; features?:string[]; translation?:string;
  heightM?:number; floors?:number; capacity?:number; coordinates?:number[];
  cityId?:string; nearCityId?:string; nearCityDistanceKm?:number;
  style?:string[]; material?:string[]; architect?:string[]; location?:string[]; country?:string[];
  type?:string[]; demolished?:string[]; teams?:{id:string;name:string;league:string}[];
}
const canonicalTeam=(name:string)=>name.toLowerCase().replace('los angeles','la').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const directoryTeams=new Set(teamVenues.flatMap(r=>r.teams.map(t=>canonicalTeam(t.name))));
const references:ArchitectureReference[]=[...notes,...teamVenues,...supertalls,...cityExamples,...(rawReferences as ArchitectureReference[]).map(r=>({...r,teams:r.teams?.filter(t=>!directoryTeams.has(canonicalTeam(t.name)))}))] as ArchitectureReference[];
const byId=new Map(references.map(r=>[r.id,r]));
const cities=rawCities as {id:string;name:string;asciiName:string;country:string;population:number;exampleIds:string[]}[];
const cityById=new Map(cities.map(c=>[c.id,c]));
const directCityCounts=new Map<string,number>();
for(const r of cityExamples)directCityCounts.set(r.cityId,(directCityCounts.get(r.cityId)||0)+1);
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const stop=new Set('a an the of in at for to me make build create model design generate please like inspired based example building buildings all every from with and search find show list browse examples references real architecture'.split(' '));
const index=references.map(r=>({r,text:normalize([r.name,...r.aliases||[],r.city||'',r.description||'',...r.type||[],...r.categories,...r.location||[],...r.country||[],...r.style||[],...r.teams?.map(t=>`${t.name} ${t.league}`)||[],cityById.get(r.nearCityId||'')?.name||''].join(' ')),name:normalize(r.name)}));
const genericTeamWords=new Set('stadium arena football soccer baseball basketball hockey cricket rugby club team fc afc city united athletic new los angeles al the national league'.split(' '));
const hasPhrase=(text:string,phrase:string)=>!!phrase&&(` ${text} `).includes(` ${phrase} `);

export function searchArchitectureReferences(query:string,limit=5,offset=0) {
  const text=normalize(query),words=text.split(' ').filter(w=>w.length>1&&!stop.has(w));
  const cityMatches=cities.filter(c=>(normalize(c.name).length>=4&&hasPhrase(text,normalize(c.name)))||(normalize(c.asciiName).length>=4&&hasPhrase(text,normalize(c.asciiName)))).sort((a,b)=>b.name.length-a.name.length||b.population-a.population);
  const city=cityMatches[0];
  const cityScoped=!!city&&[city.name,city.asciiName].some(name=>['in','from','within','around','near'].some(preposition=>hasPhrase(text,`${preposition} ${normalize(name)}`)));
  const sports=/\b(stadium|stadiums|arena|arenas|football|soccer|baseball|basketball|hockey|cricket|rugby)\b/.test(text);
  const residential=/\b(condo|condos|condominium|condominiums|residential|apartment|apartments|housing)\b/.test(text);
  const tall=/\b(supertall|supertalls|skyscraper|skyscrapers)\b/.test(text);
  const leagueAliases:Record<string,string>={nfl:'National Football League',nba:'National Basketball Association',mlb:'Major League Baseball',nhl:'National Hockey League',mls:'Major League Soccer',wnba:'Women’s National Basketball Association',ipl:'Indian Premier League'};
  const requestedLeague=Object.entries(leagueAliases).find(([alias])=>hasPhrase(text,alias))?.[1];
  const ranked=index.map(({r,text:entry,name})=>{
    const exact=hasPhrase(text,name)&&name.length>3&&!/^(building|stadium|arena|tower|house|residential building|apartment building|skyscraper)$/.test(name);
    const team=r.teams?.some(t=>hasPhrase(text,normalize(t.name)))||r.aliases?.some(a=>hasPhrase(text,normalize(a)));
    const partialTeam=words.some(w=>w.length>2&&!genericTeamWords.has(w)&&r.teams?.some(t=>hasPhrase(normalize(t.name),w)));
    const categoryMatch=sports&&r.categories.some(c=>/stadium|arena|sports venue/.test(c))||residential&&r.categories.some(c=>/residential|condominium/.test(c))||tall&&r.categories.some(c=>/supertall|skyscraper/.test(c));
    const apartmentEvidence=/condominium|apartment|residential (?:tower|skyscraper|complex)|housing (?:estate|complex)/.test(entry);
    const cityMatch=city&&(r.cityId===city.id||r.nearCityId===city.id||normalize(r.city||'')===normalize(city.name));
    let score=(words.length?0:1)+words.reduce((n,w)=>n+(hasPhrase(name,w)?6:hasPhrase(entry,w)?2:0)+(r.teams?.some(t=>hasPhrase(normalize(t.name),w))?8:0),0)+(exact?100:0)+(team?90:partialTeam?70:0)+(categoryMatch?8:0)+(cityMatch?20:0);
    if(requestedLeague&&!r.teams?.some(t=>normalize(t.league)===normalize(requestedLeague))&&!exact)score=0;
    if(residential&&apartmentEvidence&&score>0)score+=12;
    if(r.features&&score>0)score+=30;
    if((r.id.startsWith('espn:')||r.id.startsWith('official:')||r.id.startsWith('mlb:'))&&score>0)score+=5;
    // City requests must use actual local records, never quietly substitute a faraway landmark.
    if(city&&!cityMatch&&!exact&&!team)score=0;
    if(cityScoped&&!cityMatch&&!exact)score=0;
    if((sports||residential||tall)&&!categoryMatch&&!exact&&!team)score=0;
    if(r.name===r.id&&!hasPhrase(text,normalize(r.id)))score=0;
    if(r.demolished?.length&&!/historic|demolished|former/.test(text)&&!exact)score=0;
    return {r,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.name.localeCompare(b.r.name));
  const names=new Set<string>();
  const distinct=ranked.filter(({score})=>!ranked.length||ranked[0].score<90||score>=90).filter(({r})=>{const key=normalize(r.name);if(names.has(key))return false;names.add(key);return true;});
  const start=Math.max(0,Math.floor(offset)||0),size=Math.max(1,Math.min(20,Math.floor(limit)||5));
  return {results:distinct.slice(start,start+size).map(({r})=>referenceDetails(r)),total:distinct.length,nextOffset:start+size<distinct.length?start+size:null,city:city?{name:city.name,country:city.country,population:city.population,nearbyExampleCount:city.exampleIds.length,directExampleCount:directCityCounts.get(city.id)||0,source:`https://www.geonames.org/${city.id}/`}:null,coverage:{dataCredits:[{name:'Wikidata',license:'CC0',url:'https://www.wikidata.org/wiki/Wikidata:Licensing'},{name:'GeoNames',license:'CC BY 4.0',url:'https://www.geonames.org/about.html'},{name:'Wikipedia contributors',license:'CC BY-SA 4.0',url:'https://en.wikipedia.org/wiki/List_of_supertall_skyscrapers'}],references:references.length,categories:coverage.counts,teamDirectoryLeagues:teamCoverage.leagues.map(l=>({name:l.league,teams:l.teams.length,teamsWithoutVenue:l.teams.filter(t=>!t.venue).length})),leagues:coverage.leagues.map(l=>({name:l.name,indexedTeams:l.teams.length,teamsWithoutVenue:l.teams.filter(t=>!t.venues.length).length})),citiesOver200k:coverage.citiesOver200k,citiesWithNearbyExamples:coverage.citiesWithNearbyExamples,citiesWithAnyExample:cities.filter(c=>c.exampleIds.length||directCityCounts.has(c.id)).length,scope:coverage.scope,generatedAt:coverage.generatedAt}};
}
function referenceDetails(r:ArchitectureReference) {
  const city=cityById.get(r.nearCityId||'');
  return {...r,source:r.source||`https://www.wikidata.org/wiki/${r.id}`,...city?{nearbyCity:city.name}:{}};
}
export function architectureSources(ids:unknown):{id:string;name:string;url:string}[] {
  if(ids===undefined)return [];
  if(!Array.isArray(ids)||ids.length>3||!ids.every(id=>typeof id==='string'&&byId.has(id)))throw new Error('referenceIds must contain up to 3 IDs from the supplied reference library.');
  return [...new Set(ids as string[])].map(id=>{const r=byId.get(id)!;return {id,name:r.name,url:r.source||`https://www.wikidata.org/wiki/${id}`};});
}
export function architectureReferenceContext(text:string):string {
  if(!/\b(make|create|build|design|generate|model|example|reference)\b/i.test(text)||/\b(quick|preset|catalog)\b/i.test(text))return '';
  const found=searchArchitectureReferences(text,3);
  if(!found.results.length&&!found.city&&!/\b(building|stadium|arena|tower|supertall|skyscraper|condo|apartment|residential|housing)\b/i.test(text))return '';
  const compact=found.results.map(r=>({id:r.id,name:r.name,categories:r.categories,source:r.source,city:r.city||r.nearbyCity,heightM:r.heightM,floors:r.floors,capacity:r.capacity,features:r.features,modelingSuggestion:r.translation,style:r.style?.slice(0,3),material:r.material?.slice(0,3),description:r.description?.slice(0,240),teams:r.teams?.slice(0,4),demolished:r.demolished}));
  return '\n'+REFERENCE_CONTEXT_HEADER+'\n'+JSON.stringify({city:found.city,examples:compact})+'\nUse relevant facts and defining features to design a new create_design assembly; these are not fixed presets. Set referenceIds to the IDs actually used (max 3). Supplied URLs identify retrieved text facts, not an image you have seen. Only some references have researched shape notes. Metadata-only entries do NOT establish footprint, roof shape, facade, color, or condominium ownership. For missing form information, label your geometry as a conceptual assumption. Modeling suggestions are our approximate translations, not measured source geometry. Follow the user’s dimensions over source dimensions. If no local example exists, disclose that gap; do not claim complete worldwide coverage or that model weights were trained.\n'+assemblyLesson(text);
}
function assemblyLesson(text:string):string {
  if(/habitat\s*67/i.test(text))return 'Worked geometry exercise, invented 24m-wide dimensions; NOT a measured Habitat 67 replica. Adapt this spatial pattern to the request instead of copying it blindly: '+JSON.stringify({features:['offset stacked dwelling boxes','exposed roof terraces'],parts:[[-8,1.5,0],[0,1.5,0],[8,1.5,0],[-4,1.5,6],[4,1.5,6],[-4,4.5,0],[4,4.5,0],[0,7.5,0]].map((position,i)=>({name:'dwelling '+(i+1),shape:'box',position,size:[8,3,6],color:'#cccccc'}))})+'. All eight modules touch ground or overlap supporting modules below. Roof terraces are the portions left exposed by upper setbacks. Source referenceIds are supplied above; name the actual source used.';
  if(/stadium|arena|football|soccer|baseball|basketball|hockey|cricket|rugby/i.test(text))return 'Geometry exercise (invented dimensions, not source measurements): field box center [0,0.1,0], size [68,0.2,105]. Place stands OUTSIDE it: left center [-44,5,0], right [44,5,0], each size [20,10,125]; ends center [0,5,-62.5] and [0,5,62.5], size [68,10,20]. Add outward, higher tiers without filling the pitch. Roofs must preserve the requested opening. Adapt dimensions, symmetry and roof to the chosen example; do not blindly copy this exercise.';
  if(/condo|residential|apartment|housing/i.test(text))return 'Geometry exercise (invented): base size [30,4,24], center [0,2,0]; tower size [18,30,14], center [0,19,0]; balcony plates size [21,0.3,17], centers [0,10,0], [0,16,0], [0,22,0], [0,28,0]. Their cores overlap the continuous tower, leaving only their edges exposed. Adapt the layout, setbacks and balcony rhythm to the actual reference.';
  return 'Geometry exercise (invented): base size [40,8,40] center [0,4,0]; shaft size [24,80,24] center [0,48,0]; crown size [16,12,16] center [0,94,0]. Each stacked part starts at the previous top. For setbacks, Y increases by previous height/2 + next height/2. Adapt the footprint and tier proportions to the reference; do not reuse a generic tower for every example.';
}
export const SEARCH_ARCHITECTURE_TOOL={name:'search_architecture_references',description:'Find real sourced building examples by building, team, league, city, or category. Returns source URLs, factual metadata, researched shape notes where available, and honest city coverage. These are references for new designs, not geometry presets.',input_schema:{type:'object' as const,properties:{query:{type:'string'},limit:{type:'integer',minimum:1,maximum:20},offset:{type:'integer',minimum:0}},required:['query'],additionalProperties:false}};

/** Make example use and explicit part counts part of the actual decoding contract. */
export function designReferenceConstraints(text:string) {
  const references=searchArchitectureReferences(text,3).results.map(r=>r.id);
  const range=text.match(/\b(\d{1,2})\s*(?:to|–|-)\s*(\d{1,2})\s+(?:[a-z]+\s+){0,2}(?:parts|modules|pieces)\b/i);
  const count=text.match(/\b(\d{1,2})\s+(?:parts|modules|pieces)\b/i);
  const minParts=range?Number(range[1]):count?Number(count[1]):/\b(stadium|arena|condo|condominium|residential|apartment|supertall|skyscraper)\b/i.test(text)?8:3;
  const countedModules=!!(range||count)&&/\bmodules\b/i.test(text);
  return {references,countedModules,moduleMaximum:range?Number(range[2]):count?Number(count[1]):96,minParts:Math.max(1,Math.min(96,minParts)),maxParts:range&&!countedModules?Math.min(96,Math.max(minParts,Number(range[2]))):96};
}
export function constrainDesignTool<T extends {name:string;input_schema:unknown}>(tool:T,text:string):T {
  if(tool.name!=='create_design')return tool;
  const {references,minParts,maxParts,countedModules,moduleMaximum}=designReferenceConstraints(text);
  const schema=tool.input_schema as {properties:Record<string,unknown>;required:string[]};
  return {...tool,input_schema:{...schema,properties:{...schema.properties,parts:{...schema.properties.parts as object,minItems:minParts,maxItems:maxParts,...countedModules?{description:`Include ${minParts}–${moduleMaximum} distinct parts named dwelling/module/unit. Supports and terraces are additional parts; they do not count as dwelling modules.`}:{}},...references.length?{referenceIds:{type:'array',minItems:1,maxItems:3,items:{type:'string',enum:references}}}:{}},required:[...schema.required,...references.length?['referenceIds']:[]]}};
}
export function validateDesignRequest(input:Record<string,unknown>,text:string):void {
  const {references,minParts,maxParts,countedModules,moduleMaximum}=designReferenceConstraints(text);
  if(!Array.isArray(input.parts)||input.parts.length<minParts||input.parts.length>maxParts)throw new Error(`This request needs ${minParts}–${maxParts} parts; do not replace it with one generic primitive.`);
  const unique=new Set(input.parts.map(p=>JSON.stringify([p.shape,p.position,p.size,p.rotation||[0,0,0],p.color||'',p.material||'solid'])));
  if(unique.size<minParts)throw new Error(`Create at least ${minParts} distinct parts; repeated identical geometry does not count as additional modules.`);
  if(countedModules){const modules=input.parts.filter(p=>/\b(module|dwelling|unit)\b/i.test(p.name||''));if(modules.length<minParts||modules.length>moduleMaximum)throw new Error(`The user requested ${minParts}–${moduleMaximum} dwelling modules, not miscellaneous parts. Include that many distinct parts named dwelling/module/unit, in addition to optional supports and terraces. Use the worked stacking example.`);}
  if(/(?:above ground|aboveground|ground level)/i.test(text)&&Array.isArray(input.parts))for(const part of input.parts){
    if(part&&Array.isArray(part.position)&&Array.isArray(part.size)&&(!part.rotation||(!part.rotation[0]&&!part.rotation[2]))&&part.position[1]-part.size[1]/2 < -0.001)throw new Error(`Part ${part.name} extends below ground. For height ${part.size[1]}, center Y must be at least ${part.size[1]/2}.`);
  }
  if(/\bsupported\b/i.test(text)&&Array.isArray(input.parts)) {
    // Conservative bounding-box connectivity, not structural engineering validation.
    const bounds=input.parts.map(part=>{
      if(!part||!Array.isArray(part.position)||!Array.isArray(part.size))return null;
      let half=part.size.map((n:number)=>n/2);
      for(let axis=0;axis<3;axis++){
        const angle=(part.rotation?.[axis]||0)*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
        const a=(axis+1)%3,b=(axis+2)%3,ha=half[a],hb=half[b];half[a]=ha*c+hb*s;half[b]=ha*s+hb*c;
      }
      return {min:part.position.map((n:number,i:number)=>n-half[i]),max:part.position.map((n:number,i:number)=>n+half[i])};
    });
    if(bounds.every(b=>b!==null)) {
      const reached=new Set(bounds.flatMap((b,i)=>b!.min[1]<=.001&&b!.max[1]>=0?[i]:[]));
      for(let round=0;round<bounds.length;round++)for(let i=0;i<bounds.length;i++)if(!reached.has(i)&&[...reached].some(j=>bounds[i]!.min.every((n:number,axis:number)=>n<=bounds[j]!.max[axis]+.001&&bounds[i]!.max[axis]>=bounds[j]!.min[axis]-.001)))reached.add(i);
      const floating=bounds.findIndex((_,i)=>!reached.has(i));
      if(floating>=0)throw new Error(`Part ${input.parts[floating].name} is disconnected from the ground-supported assembly. Move it to touch or overlap a supported part, or supply connecting supports. Do not leave terraces floating away from walls.`);
    }
  }
  if(references.length&&(!Array.isArray(input.referenceIds)||!input.referenceIds.length||input.referenceIds.some(id=>!references.includes(id))))throw new Error(`Use referenceIds from the supplied examples: ${references.join(', ')}.`);
}

/** An in-context worked example, never an executable fallback or stored user turn. */
export function designDemonstration(text:string):{role:'user'|'assistant';content:string}[] {
  if(!/condo|residential|apartment|housing|habitat\s*67/i.test(text))return [];
  const parts=[[-8,1.5,0],[0,1.5,0],[8,1.5,0],[-4,1.5,6],[4,1.5,6],[-4,4.5,0],[4,4.5,0],[0,7.5,0]].map((position,i)=>({name:`dwelling module ${i+1}`,shape:'box',position,size:[8,3,6],color:'#cccccc'}));
  return [
    {role:'user',content:'Worked example only, not the current request: create a small stepped housing concept inspired by Habitat 67, using eight supported dwelling modules and invented dimensions. Show the complete assembly JSON. For the actual request that follows, adapt the form and dimensions and use only its supplied reference IDs.'},
    {role:'assistant',content:JSON.stringify({reply:'',calls:[{name:'create_design',arguments:{name:'Stepped housing exercise',reference:'Habitat 67, conceptual massing with invented dimensions',referenceIds:['example:habitat-67'],features:['offset stacked dwelling modules','exposed roof terraces'],parts}}]})},
  ];
}
