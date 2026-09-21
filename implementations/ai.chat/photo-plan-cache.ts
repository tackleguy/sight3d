import {validateKnowledgeDesign} from './knowledge-design';
const KEY='sight3d.photo-plans.v1';
type Entry={photo:string;prompt:string;plan:Record<string,unknown>;saved:number};
export function readPhotoPlan(photo:string,prompt:string,storage:Storage=localStorage):Record<string,unknown>|null {
  try {const entries:Entry[]=JSON.parse(storage.getItem(KEY)||'[]');const entry=entries.find(e=>e.photo===photo&&e.prompt===prompt&&Date.now()-e.saved<30*86400000);if(!entry)return null;validateKnowledgeDesign(entry.plan);return JSON.parse(JSON.stringify(entry.plan));}catch{return null;}
}
export function savePhotoPlan(photo:string,prompt:string,plan:Record<string,unknown>,storage:Storage=localStorage) {
  try {validateKnowledgeDesign(plan);const entries:Entry[]=JSON.parse(storage.getItem(KEY)||'[]');storage.setItem(KEY,JSON.stringify([{photo,prompt,plan,saved:Date.now()},...entries.filter(e=>e.photo!==photo||e.prompt!==prompt)].slice(0,12)));}catch{/* Storage is optional; successful geometry must not depend on quota. */}
}
