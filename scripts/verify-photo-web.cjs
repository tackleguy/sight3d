// Real photo search/pixels + real geometry. Inference is stubbed; this is not a vision-quality benchmark.
const {chromium}=require('@playwright/test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist/web');let browser,server;
(async()=>{
 server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/sight3d\//,'');const file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/sight3d/`);await page.getByText('Start modeling',{exact:true}).click();await page.waitForFunction(()=>!!window.modelAPI);await page.getByRole('button',{name:'Close quick start',exact:true}).click();
 await page.locator('#photo-search').fill('Allianz Arena');await page.getByRole('button',{name:'Find',exact:true}).click();await page.getByText('400,000 photo records · images load on demand',{exact:true}).waitFor();
 const tiles=page.locator('.photo-tile');await tiles.first().waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.photo-tile img')].some(img=>img.complete&&img.naturalWidth>0));
 await page.screenshot({path:'/tmp/sight3d-photos-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/sight3d-photos-mobile.png'});await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{
  const original=window.api.invoke.bind(window.api);window.__photoCalls=0;window.__pixelInput=false;
  window.api.invoke=async(channel,args)=>{
   if(channel!=='ai:chat')return original(channel,args);
   window.__photoCalls++;
   if(window.__photoCalls===1){window.__pixelInput=/^data:image\/jpeg;base64,/.test(args.photo?.image)&&args.photo.image.length>1000;return{content:[{type:'tool_use',id:'photo_test',name:'create_design',input:{name:'Test photo assembly',reference:'Photo integration test; invented dimensions',features:['open field'],parts:[{name:'field',shape:'box',position:[0,.1,0],size:[68,.2,105]},{name:'west stand',shape:'box',position:[-44,5,0],size:[20,10,125]},{name:'east stand',shape:'box',position:[44,5,0],size:[20,10,125]},{name:'north stand',shape:'box',position:[0,5,-62.5],size:[68,10,20]},{name:'south stand',shape:'box',position:[0,5,62.5],size:[68,10,20]}]}}],stop_reason:'tool_use'};}
   return{content:[{type:'text',text:'Photo integration completed.'}],stop_reason:'end_turn'};
  };
 });
 await tiles.locator('button:not(:disabled)').first().click();const prompt=await page.locator('#ai-prompt-input').inputValue();await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Photo integration completed.',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>window.__pixelInput),true);assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),30);
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),0);
 const calls=await page.evaluate(()=>window.__photoCalls);await tiles.locator('button:not(:disabled)').first().click();await page.locator('#ai-prompt-input').fill(prompt);await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText(/Reused your previous completed photo design/).waitFor();assert.equal(await page.evaluate(()=>window.__photoCalls),calls);assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),30);
 assert.deepEqual(await page.locator('.ai-chat-error').allTextContents(),[]);assert.deepEqual(errors,[]);
 console.log('PASS: 400,000-record index, live thumbnail pixels, selected photo attachment, real geometry/undo, and repeat plan with zero additional model calls. Inference stubbed; visual fidelity not evaluated.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
