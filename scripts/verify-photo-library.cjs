const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {createPhotoLibrary,photoThumbnail}=require('../implementations/ai.chat/photo-library.ts');
const root=path.resolve(__dirname,'../data/photos'),read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
(async()=>{
 const manifest=read('manifest.json'),catalog=read('landmarks.json'),ids=new Set(),urls=new Set();let count=0;
 for(const [file,hash] of Object.entries(manifest.files)){
  const bytes=fs.readFileSync(path.join(root,file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);
  for(const [landmark,rows] of Object.entries(JSON.parse(bytes)))for(const row of rows){assert.equal(row.length,6);assert.match(row[0],/^[a-f0-9]{16}$/);assert.ok(!ids.has(row[0]));assert.ok(!urls.has(row[1]));ids.add(row[0]);urls.add(row[1]);assert.match(row[1],/^https:\/\/upload.wikimedia.org\//);assert.match(row[2],/^https:\/\/commons.wikimedia.org\//);assert.ok(row[3]);assert.match(row[4],/creativecommons.org/);count++;}
 }
 assert.equal(count,400000);assert.equal(count,manifest.photoCount);assert.equal(catalog.reduce((n,r)=>n+r.count,0),count);
 const fetcher=async url=>({ok:true,json:async()=>read(path.basename(url))});
 const library=createPhotoLibrary('/photos/',fetcher),start=performance.now();await library.stats();const coldIndexMs=performance.now()-start;
 const times=[],failures=[];
 for(let i=0;i<1000;i++){const row=catalog[Math.floor(i*catalog.length/1000)],t=performance.now(),results=await library.search(row.name,12);times.push(performance.now()-t);if(!results.some(p=>p.landmarkId===row.id))failures.push({query:row.name,expected:row.id,actual:results.map(r=>r.landmark)});}
 times.sort((a,b)=>a-b);
 const result={photoCount:count,landmarkCount:catalog.length,sourceIdsAndUrlsUnique:true,sourceFileHashesVerified:true,searches:1000,passed:1000-failures.length,failed:failures.length,coldIndexMs,p50Ms:times[500],p95Ms:times[950],note:'Local metadata lookup using filesystem reads; excludes network transfer, image loading and model inference. Photo bytes and visual fidelity are not verified.',failures};
 fs.mkdirSync(path.resolve(__dirname,'../tests/reports'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../tests/reports/photo-library.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));assert.equal(failures.length,0);
})().catch(e=>{console.error(e);process.exitCode=1;});
