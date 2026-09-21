// Run after build:web. Exercises the actual static output, including subdirectory hosting.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist/web');
let browser, server;
(async () => {
  let url = process.env.SIGHT3D_URL;
  if (!url) {
    assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Run npm run build:web first');
    server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname.startsWith('/sight3d/') ? pathname.slice('/sight3d/'.length) : pathname.slice(1);
      const file = path.resolve(root, relative || 'index.html');
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
      }
      res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}/sight3d/`;
  }
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on('dialog', dialog => dialog.accept());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText} ${request.url()}`));
  // Unsupported hardware must remain usable without downloading an AI model.
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: { requestAdapter: async () => null }, configurable: true }));
  const response = await page.goto(url);
  assert.equal(response.status(), 200);
  await page.getByText('Start modeling', { exact: true }).click();
  await page.waitForFunction(() => !!window.modelAPI);
  await page.getByRole('button', { name: 'Close quick start', exact: true }).click();
  await page.getByRole('button', { name: 'Enable browser AI', exact: true }).click();
  await page.getByText(/No compatible GPU is available/).waitFor();
  // Stub inference only; the production UI executes the real modeling operation.
  await page.evaluate(() => {
    const invoke = window.api.invoke.bind(window.api);
    let calls = 0;
    window.api.invoke = async (channel, args) => {
      if (channel !== 'ai:chat') return invoke(channel, args);
      return ++calls === 1
        ? { content: [{ type: 'tool_use', id: 'production-box', name: 'create_box', input: { width: 2, depth: 3, height: 4 } }], stop_reason: 'tool_use' }
        : { content: [{ type: 'text', text: 'Production test box created.' }], stop_reason: 'end_turn' };
    };
  });
  await page.locator('#ai-prompt-input').fill('Create a 2 by 3 by 4 meter box');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('Production test box created.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.modelAPI.getAllFaces().length), 6);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal(await page.evaluate(() => window.modelAPI.getAllFaces().length), 0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  assert.equal(await page.evaluate(() => window.modelAPI.getAllFaces().length), 6);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  // Exercise new direct tools through the real production assistant and renderer.
  for (const input of [{type:'glass_of_water',radius:1,height:3}, {type:'arc',radius:2,angle:120,color:'blue',x:4}, {type:'chair',width:2,depth:2,height:3,x:-4,material:'wood'}]) {
    const before=await page.evaluate(()=>window.modelAPI.getAllFaces().length);
    await page.evaluate(input=>{
      const invoke=window.api.invoke.bind(window.api);let calls=0;
      window.api.invoke=async(channel,args)=>channel!=='ai:chat'?invoke(channel,args):++calls===1
        ? {content:[{type:'tool_use',id:'object',name:'create_object',input}],stop_reason:'tool_use'}
        : {content:[{type:'text',text:`Verified ${input.type}`}],stop_reason:'end_turn'};
    },input);
    await page.locator('#ai-prompt-input').fill(`Create ${input.type}`);
    await page.getByRole('button',{name:'Send',exact:true}).click();
    await page.getByText(`Verified ${input.type}`,{exact:true}).waitFor();
    assert.ok(await page.evaluate(()=>window.modelAPI.getAllFaces().length)>before);
  }
  await page.evaluate(()=>{window.modelAPI.setView('iso');window.modelAPI.zoomExtents();});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'/tmp/sight3d-objects-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/sight3d-objects-mobile.png'});
  assert.deepEqual(await page.locator('.ai-chat-error').allTextContents(),[]);
  await page.setViewportSize({width:1440,height:1000});
  for(const [catalogId,prompt,height] of [
    ['art_museum/brutalist/terraced','Create a terraced brutalist art museum, 48m wide, 30m deep and 20m tall.',20],
    ['railway_station/traditional/compact','Create a traditional railway station, 70m wide.',17],
    ['aircraft_hangar/contemporary/compact','Create an aircraft hangar.',24],
    ['soccer_stadium/contemporary/compact','Create a soccer stadium.',28],
    ['basketball_arena/contemporary/compact','Create a basketball arena with an open roof.',20],
    ['ice_hockey_arena/contemporary/compact','Create an ice hockey arena.',20],
  ]){
    await page.evaluate(()=>window.modelAPI.deleteEntities(window.modelAPI.getAllFaces()));
    await page.evaluate(catalogId=>{
      const invoke=window.api.invoke.bind(window.api);let calls=0;
      window.api.invoke=async(channel,args)=>channel!=='ai:chat'?invoke(channel,args):++calls===1
        ? {content:[{type:'tool_use',id:'catalog-model',name:'create_building',input:{catalogId,detail:3}}],stop_reason:'tool_use'}
        : {content:[{type:'text',text:`Verified ${catalogId}`}],stop_reason:'end_turn'};
    },catalogId);
    await page.locator('#ai-prompt-input').fill(prompt);
    await page.getByRole('button',{name:'Send',exact:true}).click();
    await page.getByText(`Verified ${catalogId}`,{exact:true}).waitFor();
    const faceCount=await page.evaluate(()=>window.modelAPI.getAllFaces().length);
    assert.ok(faceCount>20,`${catalogId} must create its building geometry`);
    console.log(`Catalog: ${catalogId}, ${faceCount} faces`);
    assert.ok(Math.abs(await page.evaluate(()=>window.modelAPI.getBoundingBox().max.y)-height)<.001);
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:`/tmp/sight3d-catalog-${catalogId.split('/')[0]}.png`});
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),0);
  }
  for(const [input,prompt,label] of [
    [{type:'semiconductor fabrication plant',detail:2},'Create a semiconductor fabrication plant.','family'],
    [{buildingUse:'lunar archival facility',baseType:'civic',features:['canopy','skylights'],detail:2},'Create a lunar archival facility, 40m wide and 18m tall.','custom'],
  ]){
    await page.evaluate(input=>{
      const invoke=window.api.invoke.bind(window.api);let calls=0;
      window.api.invoke=async(channel,args)=>channel!=='ai:chat'?invoke(channel,args):++calls===1
        ? {content:[{type:'tool_use',id:'extended-model',name:'create_building',input}],stop_reason:'tool_use'}
        : {content:[{type:'text',text:'Extended building verified'}],stop_reason:'end_turn'};
    },input);
    await page.locator('#ai-prompt-input').fill(prompt);
    await page.getByRole('button',{name:'Send',exact:true}).click();
    await page.getByText('Extended building verified',{exact:true}).last().waitFor();
    await page.waitForFunction(()=>!document.querySelector('.ai-progress'));
    assert.ok(await page.evaluate(()=>window.modelAPI.getAllFaces().length)>20);
    if(label==='custom')assert.ok(Math.abs(await page.evaluate(()=>window.modelAPI.getBoundingBox().max.y)-18)<.001);
    assert.deepEqual(await page.locator('.ai-chat-error').allTextContents(),[]);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.modelAPI.getAllFaces().length),0);
  }
  await page.getByRole('button',{name:'New chat',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/sight3d-catalog-mobile.png'});
  console.log('Production catalog buildings, objects and undo/redo passed; checking refresh.');
  await page.reload();
  await page.getByText('Start modeling', { exact: true }).waitFor();
  assert.deepEqual(errors, [], 'Production site must not emit browser or HTTP errors');
  console.log(`PASS: ${url} loads, models, undo/redo, refresh and unsupported-GPU recovery without browser errors.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
