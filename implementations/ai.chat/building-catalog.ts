import { EXTENDED_BUILDING_ARCHETYPES } from './building-families';
import { SPORTS, findSport } from './sports-venues';
/** Procedural concept-design recipes, not a historical taxonomy or training dataset. */
export interface BuildingArchetype {
  id:string; category:string; name:string; aliases:string[]; baseType:string;
  width:number; depth:number; height:number; floors:number; roof:string; feature:BuildingFeature; coverage?:'family';
}
export const BUILDING_FEATURES = ['porch','balconies','canopy','colonnade','loading_bays','chimney','spire','dome','skylights','platform','hangar_door','shopfront'] as const;
export type BuildingFeature = 'porch'|'balconies'|'canopy'|'colonnade'|'loading_bays'|'chimney'|'spire'|'dome'|'skylights'|'platform'|'hangar_door'|'shopfront';
type Row = [string,number,number,number,number,string,BuildingFeature,string?];
const groups:Array<[string,string,Row[]]> = [
  ['Detached homes','house',[
    ['bungalow',14,10,4,1,'hip','porch'],['cottage',10,8,6,2,'gable','chimney'],['villa',22,18,8,2,'hip','colonnade'],['ranch house',24,12,4.5,1,'gable','porch'],['chalet',14,12,9,2,'gable','balconies'],
  ]],
  ['Compact homes','house',[
    ['tiny house',6,3,3.6,1,'gable','porch'],['studio house',8,7,4,1,'flat','canopy'],['courtyard house',18,18,5,1,'flat','colonnade'],['row house',6,14,10,3,'gable','porch','townhouse'],['duplex',16,12,7,2,'hip','balconies'],
  ]],
  ['Multi-family housing','apartment',[
    ['garden apartment',28,18,10,3,'hip','balconies'],['midrise apartment',30,20,24,7,'flat','balconies'],['residential tower',24,24,90,28,'flat','balconies'],['student residence',40,22,21,6,'flat','canopy','dormitory'],['senior residence',32,24,14,4,'hip','balconies'],
  ]],
  ['Hospitality','apartment',[
    ['boutique hotel',22,18,17,5,'hip','canopy'],['business hotel',32,24,48,14,'flat','canopy'],['resort hotel',56,30,18,5,'hip','balconies'],['motel',48,12,7,2,'flat','balconies'],['hostel',18,16,13,4,'gable','porch'],
  ]],
  ['Offices','office',[
    ['corporate headquarters',48,36,60,16,'flat','colonnade'],['bank',28,22,12,2,'flat','colonnade'],['coworking hub',28,24,15,4,'flat','balconies'],['office tower',32,28,140,38,'flat','canopy'],['business incubator',36,24,14,3,'flat','skylights'],
  ]],
  ['Retail','civic',[
    ['corner shop',9,12,5,1,'flat','shopfront'],['supermarket',50,38,8,1,'flat','shopfront'],['department store',50,40,24,5,'flat','shopfront'],['shopping mall',90,65,18,3,'flat','skylights'],['market hall',44,28,12,1,'gable','colonnade'],
  ]],
  ['Food and drink','civic',[
    ['cafe',12,10,4.5,1,'flat','shopfront'],['restaurant',24,18,6,1,'hip','canopy'],['bakery',14,12,5,1,'gable','shopfront'],['food hall',36,26,9,1,'flat','skylights'],['brewpub',28,20,8,2,'gable','chimney'],
  ]],
  ['Early and secondary education','civic',[
    ['kindergarten',24,20,5,1,'gable','canopy'],['primary school',54,32,10,2,'hip','colonnade','elementary school'],['secondary school',64,40,15,3,'flat','colonnade','high school'],['vocational school',56,36,12,3,'flat','loading_bays'],['boarding school',64,42,18,4,'hip','colonnade'],
  ]],
  ['Higher education','civic',[
    ['university lecture hall',44,30,13,2,'flat','colonnade'],['research laboratory',42,28,18,4,'flat','skylights','research lab'],['university library',40,32,22,5,'flat','colonnade'],['art school',36,30,14,3,'flat','skylights'],['observatory',20,20,16,2,'dome','dome'],
  ]],
  ['Healthcare','civic',[
    ['general hospital',72,48,35,8,'flat','canopy','hospital'],['outpatient clinic',28,22,9,2,'flat','canopy','clinic'],['dental clinic',16,12,5,1,'flat','shopfront'],['rehabilitation center',44,30,14,3,'hip','balconies'],['veterinary hospital',24,18,8,2,'gable','canopy','veterinary clinic'],
  ]],
  ['Culture','civic',[
    ['art museum',48,36,18,3,'flat','skylights','museum'],['history museum',46,34,20,3,'hip','colonnade'],['art gallery',24,18,7,1,'flat','skylights'],['public library',32,26,13,3,'flat','colonnade','library'],['cultural center',48,32,16,3,'flat','canopy'],
  ]],
  ['Performance','civic',[
    ['theater',38,48,22,3,'flat','canopy','theatre'],['concert hall',52,38,24,2,'hip','colonnade'],['opera house',64,48,30,4,'dome','colonnade'],['cinema',44,36,14,2,'flat','canopy','movie theater'],['community auditorium',34,28,12,1,'gable','canopy'],
  ]],
  ['Civic administration','civic',[
    ['town hall',36,28,20,4,'hip','spire','city hall'],['courthouse',46,34,23,4,'hip','colonnade'],['post office',28,20,9,2,'flat','shopfront'],['castle',44,36,24,4,'flat','spire'],['community center',36,28,10,2,'flat','canopy'],
  ]],
  ['Emergency services','civic',[
    ['fire station',36,26,12,2,'flat','loading_bays'],['police station',32,24,14,3,'flat','canopy'],['ambulance station',28,22,8,1,'flat','loading_bays'],['rescue station',22,18,8,2,'gable','loading_bays'],['emergency operations center',38,30,12,2,'flat','skylights'],
  ]],
  ['Worship and reflection','civic',[
    ['church',22,40,24,1,'gable','spire'],['chapel',12,20,14,1,'gable','spire'],['mosque',36,36,22,1,'dome','dome'],['synagogue',28,24,15,2,'hip','colonnade'],['temple',30,28,15,2,'hip','colonnade','meditation hall'],
  ]],
  ['Sport and recreation','civic',[
    ['sports hall',48,32,15,1,'gable','canopy'],['swimming pool building',56,32,12,1,'flat','skylights','natatorium'],['fitness center',28,22,10,2,'flat','shopfront','gym'],['clubhouse',24,18,8,2,'hip','balconies'],
  ]],
  ['Passenger transport','civic',[
    ['railway station',70,28,17,2,'hip','platform','train station'],['bus terminal',60,28,10,1,'flat','platform','bus station'],['airport terminal',110,55,22,3,'flat','canopy'],['ferry terminal',48,26,12,2,'flat','platform'],['metro entrance',14,9,6,1,'flat','canopy','subway entrance'],
  ]],
  ['Industry and logistics','warehouse',[
    ['distribution center',100,70,14,1,'flat','loading_bays'],['cold storage warehouse',64,42,13,1,'flat','loading_bays'],['factory',80,48,16,2,'flat','chimney'],['aircraft hangar',70,65,24,1,'gable','hangar_door','hangar'],['workshop',26,20,8,1,'gable','loading_bays'],
  ]],
  ['Agriculture','warehouse',[
    ['barn',30,18,11,1,'gable','hangar_door'],['greenhouse',36,14,6,1,'gable','skylights'],['stable',42,16,7,1,'gable','porch'],['farmhouse',18,14,8,2,'gable','chimney'],['grain silo',14,14,30,1,'dome','dome','silo'],
  ]],
  ['Utilities and infrastructure','warehouse',[
    ['power station',72,42,22,2,'flat','chimney'],['water treatment plant',60,40,12,2,'flat','skylights'],['data center',66,44,17,3,'flat','loading_bays'],['parking garage',54,36,18,5,'flat','balconies','car park'],['lighthouse',10,10,32,6,'dome','dome'],
  ]],
];
groups.push(['Sports venues','stadium', [
  ['stadium',165,100,28,1,'open','canopy','sports stadium'],
  ...SPORTS.filter(s=>s[1]==='stadium').map(s=>[`${s[0]} stadium`,s[2]/.62,s[3]/.62,28,1,'open','canopy',s[5]] as Row),
]]);
groups.push(['Indoor sports venues','arena', [
  ['indoor arena',100,75,24,1,'dome','canopy','arena|sports arena'],
  ...SPORTS.filter(s=>s[1]==='arena').map(s=>[`${s[0]} arena`,s[2]/.62,s[3]/.62,20,1,'dome','canopy',s[5]] as Row),
]]);
export const BUILDING_ARCHETYPES:BuildingArchetype[]=groups.flatMap(([category,baseType,rows])=>rows.map(([name,width,depth,height,floors,roof,feature,alias])=>({id:name.replace(/ /g,'_'),category,name,aliases:alias?alias.split('|'):[],baseType,width,depth,height,floors,roof,feature})));
// Keep established IDs stable when a family also lists an existing subtype.
for(const archetype of EXTENDED_BUILDING_ARCHETYPES)if(!BUILDING_ARCHETYPES.some(a=>a.id===archetype.id))BUILDING_ARCHETYPES.push(archetype);
export const BUILDING_CATEGORIES=[...new Set(BUILDING_ARCHETYPES.map(a=>a.category))];
export const DESIGN_STYLES = {
  contemporary:{label:'Contemporary',style:'glass',roof:undefined,bayWidth:3,windowRatio:.74,bandRatio:.03},
  minimalist:{label:'Minimalist',style:'white',roof:'flat',bayWidth:5,windowRatio:.65,bandRatio:.015},
  industrial:{label:'Industrial',style:'brick',roof:'flat',bayWidth:2.4,windowRatio:.82,bandRatio:.045},
  traditional:{label:'Traditional',style:'brick',roof:'hip',bayWidth:2.6,windowRatio:.52,bandRatio:.07},
  mediterranean:{label:'Mediterranean-inspired',style:'terracotta',roof:'hip',bayWidth:3.4,windowRatio:.48,bandRatio:.06},
  nordic:{label:'Nordic-inspired',style:'white',roof:'gable',bayWidth:3.8,windowRatio:.7,bandRatio:.025},
  art_deco:{label:'Art Deco-inspired',style:'stone',roof:'flat',bayWidth:2,windowRatio:.5,bandRatio:.09},
  brutalist:{label:'Brutalist-inspired',style:'concrete',roof:'flat',bayWidth:4.2,windowRatio:.42,bandRatio:.12},
  futuristic:{label:'Futuristic',style:'glass',roof:'flat',bayWidth:4.8,windowRatio:.9,bandRatio:.02},
  vernacular:{label:'Vernacular-inspired',style:'stone',roof:'gable',bayWidth:2.8,windowRatio:.45,bandRatio:.05},
} as const;
export const MASSING_FORMS = {
  compact:{label:'Compact',width:1,depth:1,height:1,shape:'rectangle',taper:0},
  elongated:{label:'Elongated',width:1.5,depth:.7,height:1,shape:'rectangle',taper:0},
  slender:{label:'Slender',width:.8,depth:.8,height:1.3,shape:'rectangle',taper:0},
  l_wing:{label:'L-wing',width:1.2,depth:1.2,height:1,shape:'l_shape',taper:0},
  courtyard:{label:'Open courtyard',width:1.3,depth:1.3,height:1,shape:'u_shape',taper:0},
  circular:{label:'Circular',width:1.1,depth:1.1,height:1,shape:'circle',taper:0},
  oval:{label:'Oval',width:1.4,depth:.85,height:1,shape:'ellipse',taper:0},
  hexagonal:{label:'Hexagonal',width:1.1,depth:1.1,height:1,shape:'hexagon',taper:0},
  tapered:{label:'Tapered',width:1,depth:1,height:1.2,shape:'rectangle',taper:.3},
  terraced:{label:'Terraced',width:1.25,depth:1.2,height:1.1,shape:'rectangle',taper:0},
} as const;
export type DesignStyle=keyof typeof DESIGN_STYLES;
export type MassingForm=keyof typeof MASSING_FORMS;
export const BUILDING_RECIPE_COUNT=BUILDING_ARCHETYPES.length*Object.keys(DESIGN_STYLES).length*Object.keys(MASSING_FORMS).length;
const normalize=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[_-]/g,' ').replace(/\bcentre\b/g,'center').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const plural=(text:string)=>/[^aeiou]y$/.test(text)?text.slice(0,-1)+'ies':/(?:ch|sh|s|x)$/.test(text)?text+'es':text+'s';
function phrase(text:string,value:string){return (` ${normalize(text)} `).includes(` ${normalize(value)} `);}
export function findBuildingArchetype(text:string):BuildingArchetype|undefined {
  const sport=findSport(text);
  if(sport)return BUILDING_ARCHETYPES.find(a=>a.name===`${sport[0]} ${sport[1]}`);
  return BUILDING_ARCHETYPES.flatMap(item=>[item.name,...item.aliases].map(name=>({item,name})))
    .filter(({name})=>phrase(text,name)||phrase(text,plural(name))).sort((a,b)=>b.name.length-a.name.length)[0]?.item;
}
export interface BuildingRecipe { id:string; name:string; archetype:BuildingArchetype; designStyle:DesignStyle; form:MassingForm; defaults:Record<string,unknown>; approximation?:string; }
export function buildingRecipe(archetypeId:string,designStyle:DesignStyle='contemporary',form:MassingForm='compact'):BuildingRecipe {
  const a=BUILDING_ARCHETYPES.find(a=>a.id===archetypeId);
  if(!a)throw new Error(`Unknown building subtype: ${archetypeId}. Search the building catalog first.`);
  if(!Object.hasOwn(DESIGN_STYLES,designStyle)||!Object.hasOwn(MASSING_FORMS,form))throw new Error('Unknown design style or massing form. Search the building catalog for options.');
  const style=DESIGN_STYLES[designStyle],massing=MASSING_FORMS[form];
  const shape=a.id==='grain_silo'||a.id==='lighthouse'?'circle':a.id==='courtyard_house'&&form==='compact'?'u_shape':massing.shape;
  return {...(a.coverage==='family'?{approximation:`Family-level ${a.category.toLowerCase()} exterior using shared concept proportions; specialized interiors and equipment are not modeled.`}:{}),id:`${a.id}/${designStyle}/${form}`,name:`${style.label} ${a.name} · ${massing.label}`,archetype:a,designStyle,form,defaults:{type:a.baseType,...(['stadium','arena'].includes(a.baseType)?{sport:findSport(a.name)?.[0]??'multi sport'}:{}),width:a.width*massing.width,depth:a.depth*massing.depth,height:a.height*massing.height,floors:a.floors,shape,roof:['stadium','arena'].includes(a.baseType)?a.roof:style.roof??a.roof,style:a.id==='greenhouse'?'glass':style.style,taper:massing.taper,
    ...(form==='terraced'?{sections:[{at:0,scale:1},{at:.48,scale:1},{at:.5,scale:.78},{at:.78,scale:.78},{at:.8,scale:.55},{at:1,scale:.55}]}:{})}};
}
export function resolveBuildingRecipe(input:Record<string,unknown>):BuildingRecipe|undefined {
  const brief=typeof input.brief==='string'?input.brief:'';
  let id=input.catalogId,style=input.designStyle,form=input.massing;
  const mentioned=findBuildingArchetype(brief)||(typeof input.buildingUse==='string'?findBuildingArchetype(input.buildingUse):undefined)||(!input.catalogId&&typeof input.sport==='string'&&['stadium','arena'].includes(String(input.type))?findBuildingArchetype(input.sport):undefined);
  if(mentioned)id=mentioned.id;
  else if(id===undefined&&typeof input.type==='string')id=findBuildingArchetype(input.type)?.id;
  for(const key of Object.keys(DESIGN_STYLES))if(phrase(brief,key))style=key;
  for(const key of Object.keys(MASSING_FORMS))if(phrase(brief,key))form=key;
  if(id===undefined){
    const use=input.buildingUse??(typeof input.type==='string'&&!['house','apartment','office','skyscraper','warehouse','pavilion','civic','stadium','arena'].includes(input.type)?input.type:undefined)??inferBuildingUse(brief);
    if(use!==undefined)return customBuildingRecipe(use,{...input,designStyle:style,massing:form});
    return undefined;
  }
  if(typeof id!=='string')throw new Error('catalogId must be a catalog ID.');
  const parts=id.split('/');if(parts.length!==1&&parts.length!==3)throw new Error('Use subtype or subtype/style/form as catalogId.');
  return buildingRecipe(parts[0],(style??parts[1]??'contemporary') as DesignStyle,(form??parts[2]??'compact') as MassingForm);
}
export function searchBuildingCatalog(input:Record<string,unknown>={}) {
  const query=typeof input.query==='string'?normalize(input.query):'';
  const offset=input.offset??0,limit=input.limit??8;
  if(typeof offset!=='number'||!Number.isInteger(offset)||offset<0||typeof limit!=='number'||!Number.isInteger(limit)||limit<1||limit>20)throw new Error('Use a nonnegative offset and limit from 1 to 20.');
  const aliases:Record<string,string>={housing:'homes housing apartment residence',medical:'healthcare',school:'education school',transportation:'transport',religious:'worship',industrial:'industry',residential:'homes housing',commercial:'retail office food',hotel:'hotel hospitality'};
  const terms=(aliases[query]??query).split(' ').filter(Boolean);
  const ranked=BUILDING_ARCHETYPES.map(a=>({a,score:(query&&[a.name,...a.aliases].some(name=>normalize(name)===query)?100:0)+terms.reduce((n,t)=>n+(phrase(a.name,t)?4:a.aliases.some(name=>phrase(name,t))?3:phrase(a.category,t)?1:0),0)})).filter(r=>!query||r.score>0).sort((a,b)=>b.score-a.score);
  return {recipeCount:BUILDING_RECIPE_COUNT,subtypeCount:BUILDING_ARCHETYPES.length,matchCount:ranked.length,offset,nextOffset:offset+limit<ranked.length?offset+limit:null,
    categories:BUILDING_CATEGORIES,designStyles:Object.keys(DESIGN_STYLES),massingForms:Object.keys(MASSING_FORMS),
    results:ranked.slice(offset,offset+limit).map(({a})=>({id:a.id,name:a.name,category:a.category,dimensions:{width:a.width,depth:a.depth,height:a.height},floors:a.floors,roof:a.roof,feature:a.feature,coverage:a.coverage??'dedicated'})),
    note:`${BUILDING_ARCHETYPES.length} concept subtypes × 10 style treatments × 10 massing forms. Editable concepts, including sports venues; not construction plans or certified competition layouts.`};
}
export function buildingCatalogContext(text:string):string {
  const recipe=resolveBuildingRecipe({brief:text});
  if(!recipe)return /catalog|building types|types of buildings/i.test(text)?`\nLocal building catalog: ${BUILDING_RECIPE_COUNT} exterior concept recipes, from ${BUILDING_ARCHETYPES.length} subtypes, 10 styles and 10 forms. Categories: ${BUILDING_CATEGORIES.join(', ')}. Use search_building_catalog to browse or search; it does not modify geometry.`:'';
  return `\nRelevant local building recipe: ${JSON.stringify({catalogId:recipe.id,name:recipe.name,defaults:recipe.defaults,feature:recipe.archetype.feature,approximation:recipe.approximation})}. ${recipe.id.startsWith('custom/')?'Use create_building with buildingUse='+JSON.stringify(recipe.archetype.name)+' and the supplied defaults; do not pass the custom ID as catalogId.':'Use create_building with this catalogId.'} Explicit user dimensions override recipe defaults. This is a procedural exterior concept; do not promise interiors or code compliance.`;
}


/** Only infer a building use when the creation request contains a building noun.
 * Arbitrary objects and edits must remain on their own tool paths. */
export function inferBuildingUse(text:string):string|undefined {
  const match=text.match(/\b(?:create|build|make|design|generate)\s+(?:me\s+)?(?:an?\s+)?([a-z][a-z '’-]{1,90}?\b(?:building|facility|center|centre|station|house|hall|tower|plant|warehouse|school|hospital|temple|museum|library|laboratory|terminal|shelter|residence|pavilion|hotel|office|complex))(?=[,.;!?]|\s+(?:with|at|for|that|which|measuring|in|on|\d)|$)/i);
  return match?.[1].trim();
}
function customBuildingRecipe(value:unknown,input:Record<string,unknown>):BuildingRecipe {
  if(typeof value!=='string'||!value.trim()||value.length>120||/[\x00-\x1f]/.test(value))throw new Error('buildingUse must be a name of 1–120 characters.');
  const name=value.trim(),text=normalize(name);
  const rules:Array<[RegExp,string]>=[
    [/\b(warehouse|factory|manufacturing|plant|storage|workshop|depot|shed|hangar)\b/,'warehouse'],
    [/\b(house|home|cabin|cottage|hut)\b/,'house'],
    [/\b(housing|residence|apartment|hotel|hostel|dormitory)\b/,'apartment'],
    [/\b(office|headquarters|business)\b/,'office'],
    [/\b(pavilion|shelter|kiosk)\b/,'pavilion'],
  ];
  const inferred=rules.find(([pattern])=>pattern.test(text))?.[1]??'civic';
  const base=typeof input.baseType==='string'?input.baseType:inferred;
  const exemplars:Record<string,string>={house:'bungalow',apartment:'midrise_apartment',office:'coworking_hub',skyscraper:'office_tower',warehouse:'workshop',pavilion:'sports_pavilion',civic:'community_center'};
  if(!Object.hasOwn(exemplars,base))throw new Error('Custom buildings support house, apartment, office, skyscraper, warehouse, pavilion or civic as baseType.');
  const reference=BUILDING_ARCHETYPES.find(a=>a.id===exemplars[base])??BUILDING_ARCHETYPES.find(a=>a.baseType===base)!;
  const recipe=buildingRecipe(reference.id,(input.designStyle??'contemporary') as DesignStyle,(input.massing??'compact') as MassingForm);
  return {...recipe,id:`custom/${normalize(name).replace(/ /g,'_')}`,name:`Concept ${name}`,archetype:{...reference,name,baseType:base},defaults:{...recipe.defaults,type:base},approximation:`No dedicated recipe for "${name}". Using an editable ${base} exterior with inferred proportions; specialized structure, interiors and equipment are not modeled.`};
}
