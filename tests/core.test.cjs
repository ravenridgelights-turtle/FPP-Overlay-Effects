const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const schema=C.normalizeSchema({name:'WLED Test / RGB',args:[
 {name:'mapping',description:'Buffer Mapping',type:'string',contents:['Horizontal','Vertical']},
 {name:'brightness',type:'range',min:0,max:255,default:'128'},
 {name:'reversed',type:'bool',default:'false'},
 {name:'color1',type:'color',default:'#FF0000'},
 {name:'mode',type:'string',contents:['Single','Many'],children:{Many:['extra']}},
 {name:'extra',type:'int',min:1,max:5,default:'2'}
]});
test('ordered schema keeps zero and false; uses contents and defaults',()=>{
 const values=C.defaults(schema);values[1]='0';values[2]='false';
 assert.deepEqual(C.effectCommand(['Tree','Tree','Arch'],'Transparent RGB',schema,values).args,
 ['Tree,Arch','Transparent RGB','WLED Test / RGB','Horizontal','0','false','#FF0000','Single','2']);
 assert.equal(C.validation(schema,values),'');
});
test('arguments above 20 are serialized without truncation',()=>{
 const s=C.normalizeSchema({name:'Long',args:Array.from({length:32},(_,i)=>({name:'a'+i,type:'int',min:0,max:100,default:String(i)}))});
 assert.equal(C.effectCommand(['Tree'],'Enabled',s,C.defaults(s)).args.length,35);
 assert.equal(C.effectCommand(['Tree'],'Enabled',s,C.defaults(s)).args.at(-1),'31');
});
test('rejects empty/mismatched descriptions, invalid numbers and choices',()=>{
 assert.throws(()=>C.normalizeSchema({},'WLED Test'));assert.throws(()=>C.normalizeSchema({name:'Wrong'},'Expected'));
 for(const v of ['NaN','256','-1','1.2','']){const values=C.defaults(schema);values[1]=v;assert.match(C.validation(schema,values),/Check/);}
 const values=C.defaults(schema);values[0]='No such mapping';assert.match(C.validation(schema,values),/Choose/);
});
test('conditional controls hide irrelevant values without shifting positions',()=>{
 const values=C.defaults(schema);values[5]='';assert.equal(C.validation(schema,values),'');
 assert.equal(C.visibleArgs(schema,values)[5],false);values[4]='Many';assert.equal(C.visibleArgs(schema,values)[5],true);assert.match(C.validation(schema,values),/Check/);
});
test('content list URLs stay on the same FPP including a proxy prefix',()=>{
 assert.equal(C.safeApiPath('/api/overlays/fonts'),'api/overlays/fonts');
 for(const path of ['https://elsewhere/api/fonts','//elsewhere/api/fonts','api/../config','api/%2e%2e/config','api/abc\\test','api/%2f%2felsewhere'])assert.throws(()=>C.safeApiPath(path));
});
test('models include lazy subs, groups, buffer views and exact target names',()=>{
 const models=C.normalizeModels([{Name:'Tree',Type:'Channel',effectRunning:true}],['Tree','Tree_Eyes','All Props','Polar Tree','--All Models--'],{models:[{Name:'Tree_Eyes',Parent:'Tree',kind:'submodel',ChannelCountPerNode:3},{Name:'All Props',kind:'group',ChannelCountPerNode:3},{Name:'Polar Tree',kind:'buffer',BufferStyle:'Polar',ChannelCountPerNode:3}]});
 assert.equal(models.length,4);assert.equal(models.find(m=>m.Name==='Tree_Eyes').parent,'Tree');assert.equal(models.find(m=>m.Name==='All Props').kind,'group');assert.equal(models.find(m=>m.Name==='Tree').effectRunning,true);
 assert.deepEqual(C.stopCommand(['Tree_Eyes','All Props']).args,['Tree_Eyes,All Props','Enabled','Stop Effects']);
});
test('empty and comma-containing targets cannot become a broadcast',()=>{
 assert.throws(()=>C.stopCommand([]));assert.throws(()=>C.stopCommand(['Bad,Name']));assert.throws(()=>C.stopCommand(['--All Models--']));
});
test('color conversions use logical RGB, preserve RGBW, and dim mono targets',()=>{
 assert.equal(C.hsvToHex(0,1,1),'#FF0000');assert.equal(C.hsvToHex(120,1,1),'#00FF00');
 assert.equal(C.targetColor('#FF000080',4),'#FF000080');assert.equal(C.targetColor('#FF000080',3),'#FF0000');
 assert.equal(C.targetColor('#00FF00',1,0.5),'#808080');assert.equal(C.targetColor('#12345678',4,.5),'#091A2B3C');
 assert.deepEqual(C.colorParts('#11223344'),[17,34,51,68]);
});
test('mixed RGB/RGBW targets are split only where arguments differ',()=>{
 const models=[{Name:'RGB',channels:3},{Name:'GRB',channels:3},{Name:'RGBW',channels:4},{Name:'Dimmer',channels:1}];
 const commands=C.groupCommands(models,m=>C.fillCommand([m.Name],'Transparent RGB',C.targetColor('#FF008080',m.channels)));
 assert.equal(commands.length,3);assert.deepEqual(commands[0].args,['RGB,GRB','TransparentRGB','#FF0080']);
 assert.deepEqual(commands[1].args,['RGBW','TransparentRGB','#FF008080']);assert.equal(commands[2].args[2],'#FFFFFF');
});
test('Stop is targeted and uses auto-disable rather than leaving black overlays',()=>{
 assert.deepEqual(C.stopCommand(['Tree']),{command:'Overlay Model Effect',args:['Tree','Enabled','Stop Effects'],multisyncCommand:false});
});
test('queue serializes commands and replaces pending live edits',async()=>{
 const queue=new C.CommandQueue(),calls=[];let release;const gate=new Promise(r=>release=r);
 const first=queue.enqueue(async()=>{calls.push('first');await gate;},'manual');
 const old=queue.enqueue(async()=>calls.push('old'),'live');const latest=queue.enqueue(async()=>calls.push('latest'),'live');
 release();await Promise.all([first,old,latest]);assert.deepEqual(calls,['first','latest']);
});
test('Stop cancels queued changes and runs after the in-flight change',async()=>{
 const queue=new C.CommandQueue(),calls=[];let release;const gate=new Promise(r=>release=r);
 const first=queue.enqueue(async()=>{await gate;calls.push('apply');});const pending=queue.enqueue(async()=>calls.push('stale'),'live');
 queue.cancel('live');const stop=queue.enqueue(async()=>calls.push('stop'),'stop');release();await Promise.all([first,pending,stop]);assert.deepEqual(calls,['apply','stop']);
});
test('configuration defaults do not arm MultiSync or accept malformed colors',()=>{
 const c=C.freshConfig({multisync:true,solidColor:'<script>',models:['Tree',42],live:true});
 assert.equal(c.multisync,false);assert.equal(c.solidColor,'#FF6600');assert.deepEqual(c.models,['Tree']);assert.equal(c.live,true);
});
