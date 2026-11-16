/* Browser integration against a simulated FPP 10.4 HTTP service. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fixture=require('./fixtures/fpp-10.4.json'),base=path.resolve(__dirname,'..');
const root=path.join(base,'test-results');fs.mkdirSync(root,{recursive:true});
let config=null,commands=[],running=[],failCommand=false,failSystems=false,schemaFail=false;
const clone=x=>JSON.parse(JSON.stringify(x));
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=url.pathname.replace(/^\/proxy\/remote\//,'/');
 const json=(v,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};
 const text=(v,type='text/html')=>{res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(v);};
 if(p==='/api/overlays/models')return json(fixture.models);
 if(p==='/api/models')return json(fixture.names);
 if(p==='/api/overlays/running')return json(running);
 if(p==='/api/fppd/multiSyncSystems')return failSystems?json({error:'Discovery unavailable'},503):json({systems:[{hostname:'Yard FPP',address:'192.168.1.41'}]});
 if(p==='/api/overlays/fonts')return json(['DejaVu Sans','Liberation Sans']);
 if(p==='/api/overlays/effects')return json(['Stop Effects',...fixture.schemas.map(s=>s.name)]);
 if(p.startsWith('/api/overlays/effects/')){
   const name=decodeURIComponent(p.slice('/api/overlays/effects/'.length));if(name==='WLED - Slow')await new Promise(r=>setTimeout(r,300));
   return schemaFail?json({name:'Wrong effect'}):json(fixture.schemas.find(s=>s.name===name) || null);
 }
 if(p.startsWith('/api/configfile/')){
  if(req.method==='POST'){let b='';for await(const chunk of req)b+=chunk;config=JSON.parse(b);return json({Status:'OK'});}
  return config?json(config):json({Message:'Not found'},404);
 }
 if(p==='/api/command'){
  let b='';for await(const chunk of req)b+=chunk;const c=JSON.parse(b);commands.push(c);
  if(failCommand){res.writeHead(500,{'Content-Type':'text/plain'});return res.end('Simulated command rejection');}
  if(c.args[2]==='Stop Effects')running=running.filter(m=>!c.args[0].split(',').includes(m.Name));
  return text('Model Effect Started','text/plain'); // FPP 10.4 commands return text, not JSON.
 }
 if(p==='/status'){
  return text('<!doctype html><html data-bs-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:25px;background:#111218;color:#eee}:root{--bs-body-bg:#111218;--bs-body-color:#eee;--bs-secondary-bg:#24262d;--bs-border-color:#41444c;--fpp-bg-card:#1b1d24;--bs-danger:#ff9399}a{color:#9cc4ff}#playerModeInfo{padding:20px;border:1px solid #41444c;border-radius:12px}#radio-preview{padding:16px;border:1px solid #41444c;border-radius:12px;margin:15px 0;background:#282d33}</style><link rel="stylesheet" href="/assets/status.css"><script>window.handlers=[];window.OnSystemStatusChange=fn=>handlers.push(fn);window.notify=()=>handlers.forEach(fn=>fn());</script><script defer src="/assets/status.js"></script></head><body><h1>Status – Player Mode</h1><p>Interface preview · simulated FPP data</p><div id="playerModeInfo"><div id="playerStatusTop"><div class="playerStatusRow">Player Status: Playing sequence</div><div id="radio-preview">After Show Hours Radio · separate plugin</div><div><button>Play</button> <button>Stop Now</button></div></div></div></body></html>');
 }
 if(p==='/plugin.php'){
  if(url.searchParams.get('page')==='model-index.php')return json(fixture.index);
  const file=url.searchParams.get('file');
  if(file && /^assets\/[a-z-]+\.(css|js)$/.test(file)){return text(fs.readFileSync(path.join(base,file),'utf8'),file.endsWith('.css')?'text/css':'application/javascript');}
  return text('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;background:#0b0c0e;color:white}body>p{font:12px system-ui;color:#aaa;margin:0 0 14px}</style></head><body><p>Interface preview · simulated FPP 10.4 data</p>'+fs.readFileSync(path.join(base,'overlay-effects.php'),'utf8')+'</body></html>');
 }
 if(p.startsWith('/assets/'))return text(fs.readFileSync(path.join(base,p),'utf8'),p.endsWith('.css')?'text/css':'application/javascript');
 res.writeHead(404);res.end('Not found');
});
let checks=0;function pass(message){checks++;console.log('PASS '+message);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath(),args:['--no-sandbox',...(process.env.PLAYWRIGHT_SINGLE_PROCESS?['--single-process','--no-zygote','--no-process-singleton']:[])]});const context=await browser.newContext({viewport:{width:1440,height:1150}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/plugin.php');await page.getByText('FPP connected',{exact:true}).waitFor();assert.equal(commands.length,0);pass('Loading never starts lights');
  await page.getByRole('checkbox',{name:'Select Mega Tree',exact:true}).check();
  await page.getByRole('button',{name:'Chase',exact:true}).click();await page.getByRole('slider',{name:'Speed',exact:true}).waitFor();
  await page.getByRole('checkbox',{name:'Reverse',exact:true}).check();await page.locator('#foe-hex').fill('#00FF00');await page.locator('#foe-hex').dispatchEvent('change');
  await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='success');
  assert.deepEqual(commands.at(-1).args,['Mega Tree','Enabled','WLED - Chase','Horizontal','128','128','128','true','Default','#00FF00','#0000FF','#000000']);pass('Real schema order, booleans, colors and plain-text command replies');
  await page.locator('#foe-model-search').fill('Eyes');await page.getByRole('checkbox',{name:'Select Mega Tree_Eyes',exact:true}).check();assert.equal(commands.length,1);await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='success');assert.equal(commands.at(-1).args[0],'Mega Tree,Mega Tree_Eyes');pass('Lazy submodels can be selected and targeted without activating them first');
  await page.locator('#foe-model-search').fill('');await page.getByRole('checkbox',{name:'Select All RGB Props',exact:true}).check();await page.getByRole('checkbox',{name:'Select Tree Polar View',exact:true}).check();pass('Groups and polar buffer views appear alongside models and subs');
  await page.locator('#foe-output-info').evaluate(n=>n.closest('details').open=true);assert.match(await page.locator('#foe-output-info').innerText(),/GRB wire order/);pass('Displays port and virtual-string wire order without swapping command colors');
  await page.locator('#foe-preset-name').fill('Green chase');await page.locator('#foe-preset-save').click();
  await page.getByRole('button',{name:'Load preset Green chase',exact:true}).waitFor();await page.waitForFunction(()=>document.getElementById('foe-save-status').textContent.includes('Saved on this FPP'));assert.equal(config.presets[0].parameters.color1,'#00FF00');pass('Presets persist through the native FPP config-file API');
  await page.screenshot({path:path.join(root,'desktop.png'),fullPage:true});
  await page.locator('#foe-clear-selection').click();await page.getByRole('checkbox',{name:'Select Roofline',exact:true}).check();await page.getByRole('button',{name:'Solid Color',exact:true}).click();await page.getByRole('checkbox',{name:'Select Mega Tree',exact:true}).check();
  await page.locator('#foe-white').evaluate(n=>{n.value='90';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
  commands=[];await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='success');
  assert.equal(commands.length,2);assert.equal(commands[0].command,'Overlay Model Fill');assert.equal(commands[0].args[2].length,7);assert.equal(commands[1].args[2].length,9);pass('Mixed RGB/RGBW fills preserve the white channel per target');
  await page.locator('#foe-clear-selection').click();await page.getByRole('checkbox',{name:'Select Wrong RGBW',exact:true}).check();assert.equal(await page.locator('#foe-apply').isDisabled(),true);assert.match(await page.locator('#foe-notice').innerText(),/channels per node/);pass('Mismatched overlay/output channel widths block incorrect colors');
  await page.locator('#foe-clear-selection').click();await page.getByRole('checkbox',{name:'Select Porch Dimmer',exact:true}).check();assert.equal(await page.locator('#foe-wheel').isVisible(),false);commands=[];await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='success');const hex=commands[0].args[2];assert.equal(hex.slice(1,3),hex.slice(3,5));assert.equal(hex.slice(3,5),hex.slice(5,7));pass('Single-channel models use an intensity control');
  await page.locator('#foe-clear-selection').click();await page.getByRole('checkbox',{name:'Select Mega Tree',exact:true}).check();await page.getByRole('button',{name:'Text',exact:true}).click();await page.getByRole('combobox',{name:'Font',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Font',exact:true}).inputValue(),'DejaVu Sans');pass('Fonts and other contentListUrl arguments load from the same FPP');
  await page.getByRole('button',{name:'Slow',exact:true}).click();await page.getByRole('button',{name:'Fast',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#foe-effect-name').textContent==='Fast' && document.querySelector('#foe-apply').disabled===false);await page.waitForTimeout(350);commands=[];await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='success');assert.equal(commands[0].args[2],'WLED - Fast');pass('Slow effect descriptions cannot replace a newer selection');
  await page.locator('#foe-live').check();await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='success');commands=[];
  await page.locator('#foe-hex').fill('#123456');await page.locator('#foe-hex').dispatchEvent('change');await page.locator('#foe-stop').click();await page.waitForTimeout(300);assert.equal(commands.at(-1).args[2],'Stop Effects');assert.equal(commands.filter(c=>c.args[2]!=='Stop Effects').length,0);pass('Stop cancels pending live updates and does not restart lights');
  failCommand=true;await page.locator('#foe-apply').click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='error');assert.match(await page.locator('#foe-notice').innerText(),/command rejection/);failCommand=false;pass('Failed commands show a visible error');
  await page.locator('#foe-live').uncheck();await page.setViewportSize({width:390,height:844});await page.locator('.foe-mobile-tabs [data-panel="colors"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(root,'mobile.png'),fullPage:true});pass('Phone layout fits without horizontal scrolling');
  const prior=commands.length;failSystems=true;await page.goto(origin+'/proxy/remote/plugin.php');await page.getByText('FPP connected',{exact:true}).waitFor();assert.equal(commands.length,prior);pass('Local controls survive MultiSync-discovery failure and work behind an FPP proxy prefix');failSystems=false;
  schemaFail=true;await page.locator('.foe-mobile-tabs [data-panel="effects"]').click();await page.getByRole('button',{name:'Chase',exact:true}).click();await page.waitForFunction(()=>document.getElementById('foe-notice').dataset.kind==='error');assert.equal(await page.locator('#foe-apply').isDisabled(),true);schemaFail=false;pass('Malformed effect descriptions cannot be sent');
  running=[];await page.setViewportSize({width:1280,height:700});await page.goto(origin+'/status');await page.waitForTimeout(150);assert.equal(await page.locator('#foe-status-overlays').isVisible(),false);pass('Empty Status has no bubbles, heading, or box');
  running=[{Name:'Mega Tree',effect:{name:'WLED - Chase'}},{Name:'Mega Tree_Eyes',effect:{name:'Text'}},{Name:'Roofline',effect:{name:'WLED - Fire 2012'}}];await page.evaluate(()=>window.notify());await page.reload();await page.locator('.foe-status-bubble').first().waitFor();assert.equal(await page.locator('.foe-status-bubble').count(),3);assert.equal(await page.locator('#radio-preview').isVisible(),true);await page.screenshot({path:path.join(root,'status-bubbles.png'),fullPage:true});pass('Status shows compact prop/effect bubbles alongside other plugins and sequences');
  commands=[];await page.getByRole('button',{name:'Stop overlay on Mega Tree_Eyes',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.foe-status-bubble').length===2);assert.deepEqual(commands[0].args,['Mega Tree_Eyes','Enabled','Stop Effects']);assert.equal(running.length,2);pass('Per-bubble Stop removes only that target');
  await page.getByRole('button',{name:'Stop all shown overlay effects'}).click();await page.waitForFunction(()=>document.getElementById('foe-status-overlays').hidden);assert.equal(running.length,0);assert.equal(await page.locator('#radio-preview').isVisible(),true);pass('Last stopped effect hides the entire bubble panel and leaves radio/player controls alone');
  assert.deepEqual(errors,[]);pass('No uncaught browser errors');
  console.log(checks+' browser integration checks passed.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
