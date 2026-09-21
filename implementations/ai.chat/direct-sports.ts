import { resolveBuildingRecipe } from './building-catalog';
import type { AIResponse, TurnMessage } from './chat-runner';

/** A conservative shortcut for creation requests supported by the venue generator.
 * Editing, questions, multiple objects and specialized features stay with the AI. */
export function directSportsRequest(text:string):boolean {
  const request=text.trim();
  if(!/\b(stadium|arena)\b/i.test(request))return false;
  if(/\b(don't|dont|do not|never|not|instead|except|without|remove|delete|move|resize|replace|change|convert|existing|selected|how|why|explain|seats?|capacity|scoreboard|retractable|next to|beside|coordinates|interior|city|neighborhood)\b/i.test(request))return false;
  if(/\b(?:two|three|multiple|several|\d+)\s+(?:\w+\s+)?(?:stadiums|arenas)\b/i.test(request)||/\band\s+(?:a|an|another|create|build|make)\b/i.test(request))return false;
  const intent=/^(?:(?:please|can you|could you|would you|i want|i need)\s+)*(?:create|build|make|generate|add|design)\b/i.test(request);
  const recipe=resolveBuildingRecipe({brief:request});
  if(!recipe||!['stadium','arena'].includes(recipe.archetype.baseType))return false;
  const candidate=request.toLowerCase().replace(/^(a|an) /,'').replace(/[.!]$/,'').trim();
  const shorthand=[recipe.archetype.name,...recipe.archetype.aliases].some(name=>candidate===name);
  return intent||shorthand;
}

/** Each new user request gets one tool call. Later rounds only read its receipt. */
export function createDirectSportsResponder(text:string):(messages:TurnMessage[])=>AIResponse {
  let sent=false;
  const id='direct-sports-build';
  return messages=>{
    if(!sent){sent=true;return {content:[{type:'tool_use',id,name:'create_building',input:{brief:text}}],stop_reason:'tool_use'};}
    const last=messages[messages.length-1];
    const receipt=Array.isArray(last?.content)?last.content.find((r:any)=>r.type==='tool_result'&&r.tool_use_id===id):undefined;
    if(!receipt)return {error:'The venue operation returned no result. Check the model before retrying.'};
    let result;try{result=JSON.parse(receipt.content);}catch{return {error:'The venue operation returned an unreadable result.'};}
    if(result.ok!==true||!result.created?.faces?.length)return {error:result.error||'The venue could not be created.'};
    return {content:[{type:'text',text:result.summary}],stop_reason:'end_turn'};
  };
}
