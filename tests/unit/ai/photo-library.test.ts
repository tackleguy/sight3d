jest.mock('../../../implementations/data.materials/ProceduralTextures',()=>({generateBuiltinMaterials:()=>[]}));
import {createPhotoLibrary,photoThumbnail,photoMessage} from '../../../implementations/ai.chat/photo-library';
import {photoDesignRequest,validatePhotoDesign} from '../../../implementations/ai.chat/photo-design';
import {readPhotoPlan,savePhotoPlan} from '../../../implementations/ai.chat/photo-plan-cache';
import {browserRequest,generateBrowserResponse} from '../../../src/web/browser-ai-protocol';
import {chatLocal} from '../../../src/core/local-ai';
import {KNOWLEDGE_DESIGN_TOOL} from '../../../implementations/ai.chat/knowledge-design';
const photo={id:'1234567890abcdef',name:'Allianz Arena',source:'https://commons.wikimedia.org/wiki/File:Example.jpg',image:'data:image/jpeg;base64,YWJj'};
const plan={name:'Photo concept',reference:'Photo of Allianz Arena; invented dimensions',features:['open field'],parts:Array.from({length:8},(_,i)=>({name:`part ${i}`,shape:'box',size:[4,4,4],position:[i*4,2,0]}))};
test('loads catalog once and only matching photo shards, keeping source credits',async()=>{
 const requests:string[]=[];
 const files:Record<string,unknown>={'landmarks.json':[{id:'1',name:'Allianz Arena',tags:'sports venue',count:1,shard:'01'},{id:'2',name:'Burj Khalifa',tags:'skyscraper',count:1,shard:'02'}],'manifest.json':{photoCount:400000},'photos-01.json':{'1':[[photo.id,'https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg',photo.source,'Photographer','CC BY-SA 3.0','Example']]}};
 const fetcher=jest.fn(async(url:string)=>{requests.push(url);return{ok:true,json:async()=>files[url.replace('/photos/','')]};});
 const library=createPhotoLibrary('/photos/',fetcher as any);
 expect((await library.search('Create Allianz Arena'))[0]).toMatchObject({author:'Photographer',license:'CC BY-SA 3.0',source:photo.source});
 await library.search('Allianz Arena');expect(requests).toEqual(['/photos/landmarks.json','/photos/manifest.json','/photos/photos-01.json']);
 expect(await library.search('nonexistentxyz')).toEqual([]);
});
test('failed metadata loading can be retried',async()=>{
 let failed=true;const fetcher=jest.fn(async(url:string)=>{if(failed)throw new Error('offline');return{ok:true,json:async()=>url.endsWith('manifest.json')?{photoCount:400000}:[]};});
 const library=createPhotoLibrary('/photos/',fetcher as any);await expect(library.stats()).rejects.toThrow('offline');failed=false;expect((await library.stats()).photoCount).toBe(400000);
});
test('photo requests contain actual pixels and expose only create_design',()=>{
 const request=browserRequest({system:'text prompt',messages:[{role:'user',content:'Build this photo'}],tools:[KNOWLEDGE_DESIGN_TOOL,{name:'execute_script'}],photo});
 expect(request.messages[1].content).toEqual(expect.arrayContaining([expect.objectContaining({type:'image_url',image_url:{url:photo.image}})]));
 const schema=JSON.parse(request.response_format!.schema);expect(schema.properties.calls.items.properties.name.const).toBe('create_design');
 expect(()=>browserRequest({system:'',messages:[],tools:[],photo})).toThrow('Create mode');
 expect(()=>photoMessage({...photo,image:'https://not-pixels.example'},'build')).toThrow('Invalid photo');
 expect(()=>photoThumbnail('https://evil.example/photo.jpg')).toThrow('Unsupported');
 expect(photoThumbnail('https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg')).toContain('https://thumb.wikimedia.org/');
});
test('local vision transport preserves pixels and uses structured output',async()=>{
 const fetcher=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({data:[{id:'vision-model'}]})}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:'',calls:[{name:'create_design',arguments:plan}]})},finish_reason:'stop'}]})});
 const response=await chatLocal({system:'',messages:[{role:'user',content:'Create this photo'}],tools:[KNOWLEDGE_DESIGN_TOOL],photo},{},fetcher as any);
 expect(response.error).toBeUndefined();const body=JSON.parse(fetcher.mock.calls[1][1].body);expect(body.messages[1].content[1].image_url.url).toBe(photo.image);expect(body.response_format.type).toBe('json_schema');
});
test('invalid or submerged photo plans never escape the validation gate',async()=>{
 const invalid={...plan,parts:plan.parts.map(p=>({...p,position:[0,-20,0]}))};
 expect(()=>validatePhotoDesign(invalid)).toThrow('below ground');
 const generate=jest.fn().mockResolvedValue({choices:[{message:{content:JSON.stringify({reply:'',calls:[{name:'create_design',arguments:invalid}]})},finish_reason:'stop'}]});
 await expect(generateBrowserResponse({system:'',messages:[{role:'user',content:'Create this photo'}],tools:[KNOWLEDGE_DESIGN_TOOL],photo},generate)).rejects.toThrow('below ground');expect(generate).toHaveBeenCalledTimes(2);
});
test('cache keys preserve exact user constraints and invalid entries fail closed',()=>{
 const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>{data.set(key,value);}} as Storage;
 savePhotoPlan(photo.id,'20m high',plan,storage);expect(readPhotoPlan(photo.id,'20m high',storage)).toEqual(plan);expect(readPhotoPlan(photo.id,'30m high',storage)).toBeNull();expect(readPhotoPlan('other','20m high',storage)).toBeNull();
 data.set('sight3d.photo-plans.v1','broken');expect(readPhotoPlan(photo.id,'20m high',storage)).toBeNull();
});
