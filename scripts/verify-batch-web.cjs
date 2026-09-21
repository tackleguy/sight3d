// Real geometry and queue integration through the production UI; no AI transport stub.
const { chromium }=require('@playwright/test');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist/web');let server,browser;
(async()=>{
 let url=process.env.SIGHT3D_URL;
 if(!url){server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;}
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.getByText('Start modeling',{exact:true}).click();await page.getByRole('button',{name:'Close quick start',exact:true}).click();await page.waitForFunction(()=>!!window.modelAPI);
 const prompt=Array.from({length:15},(_,i)=>`${i+1}. Create 10 ${i%3===0?'red cubes':i%3===1?'blue spheres':'chairs'}.`).join('\n');
 const started=Date.now();await page.locator('#ai-prompt-input').fill(prompt);await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText(/Created 150 of 150 objects across 15 commands/).first().waitFor();
 assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),8500);assert.equal(await page.locator('.ai-chat-error').count(),0);
 console.log(`PASS: 15 commands / 150 mixed objects through production UI in ${Date.now()-started}ms without loading AI.`);
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),8464);
 await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),8500);
 // Pause the queue through its real Stop control; no hidden edits after the reply.
 await page.locator('#ai-prompt-input').fill('Create 150 cubes.');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByRole('button',{name:'Stop',exact:true}).click();await page.locator('.ai-progress').waitFor({state:'hidden'});
 const stopped=await page.evaluate(()=>window.modelAPI.getAllFaces().length);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),stopped);assert.ok(stopped<9400);
 assert.deepEqual(errors,[]);console.log('PASS: undo/redo and stop preserve completed work without browser errors.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
