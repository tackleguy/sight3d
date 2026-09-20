// Optional integration check: downloads/caches the real browser model (about 300 MB).
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
let context;
(async()=>{
 context=await chromium.launchPersistentContext('/private/tmp/sight3d-webgpu-test',{headless:process.env.HEADLESS === '1',args:['--enable-unsafe-webgpu', ...(process.env.HEADLESS === '1' ? ['--enable-unsafe-swiftshader'] : [])],viewport:{width:1440,height:1050}});
 context.on('console',m=>{if(m.type()==='error')console.log('BROWSER ERROR',m.text().slice(0,1600));});
 context.on('requestfailed',r=>console.log('FAILED DOWNLOAD',r.url(),r.failure()?.errorText));
 context.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url());});
 const page=await context.newPage(); page.setDefaultTimeout(30000);
 const posts=[];context.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 await page.goto(process.env.SIGHT3D_URL || 'http://127.0.0.1:3001');
 await page.getByText('Start modeling',{exact:true}).click();
 await page.waitForFunction(()=>!!window.modelAPI);
 await page.getByRole('button',{name:'Close quick start',exact:true}).click();
 await page.getByRole('button',{name:'Enable browser AI',exact:true}).click();
 const progress=setInterval(async()=>{try{console.log('MODEL:',await page.locator('.browser-ai-setup [role=status]').textContent());}catch{}},15000);
 try {
  await page.waitForFunction(()=>{const text=document.querySelector('.browser-ai-setup [role=status]')?.textContent;return text?.startsWith('Ready') || !!document.querySelector('.browser-ai-setup button')?.textContent?.includes('Retry');},{},{timeout:620000});
 } finally {clearInterval(progress);}
 const status=await page.locator('.browser-ai-setup [role=status]').textContent();console.log('LOAD:',status);assert.match(status,/Ready/);
 const tower = process.env.SIGHT3D_SCENARIO === 'tower';
 await page.locator('#ai-prompt-input').fill(tower ? 'Create a 48-floor glass skyscraper, 30 meters wide, 24 meters deep, with 3 setbacks and detail level 2.' : 'Create a 1 meter cube at the origin.');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 const thinking=setInterval(async()=>{try{console.log('INFERENCE:',await page.locator('.ai-progress').textContent(), 'faces:', await page.evaluate(()=>window.modelAPI.getAllFaces().length));}catch{}},15000);
 try { await page.waitForFunction(()=>!document.querySelector('.ai-progress'),{},{timeout:400000}); } finally { clearInterval(thinking); }
 console.log('ANSWER:',await page.locator('.ai-chat-msg-assistant').allTextContents());console.log('ERRORS:',await page.locator('.ai-chat-error').allTextContents());
 assert.deepEqual(await page.locator('.ai-chat-error').allTextContents(), [], 'AI turn should finish without errors');
 const faces=await page.evaluate(()=>window.modelAPI.getAllFaces().length);console.log('FACES:',faces);if(tower) assert.ok(faces>500, 'Expected a detailed skyscraper, not a box'); else assert.equal(faces,6);
 if(tower){
  await page.locator('#ai-prompt-input').fill('Add more detail to the skyscraper you just created.');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.ai-progress'),{},{timeout:400000});
  console.log('DETAIL ANSWER:',await page.locator('.ai-chat-msg-assistant').allTextContents());
  assert.deepEqual(await page.locator('.ai-chat-error').allTextContents(), []);
  const detailed=await page.evaluate(()=>window.modelAPI.getAllFaces().length);
  assert.ok(detailed>faces, 'Detail pass should add geometry');
  await page.getByRole('button',{name:'Undo last operation',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),faces);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),detailed);
 }
 assert.deepEqual(posts,[],'Inference must not make HTTP POST requests');
 await page.evaluate(()=>{window.modelAPI.clearSelection();window.modelAPI.setView('iso');window.modelAPI.zoomExtents();});
 await page.waitForTimeout(600);
 await page.screenshot({path:'.impeccable/review/browser-ai.png'});
 console.log('PASS: real in-browser model loaded and created geometry with no inference HTTP calls.');
 await context.close();
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await context?.close();});
