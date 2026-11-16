const {test}=require('node:test'),assert=require('node:assert/strict');
const {activeOverlays}=require('../assets/status-state.js');
test('a pre-update enabled solid fill appears without a running-effect record or saved label',()=>{
 const result=activeOverlays([{Name:'bottom roof',isActive:1,effectRunning:false}]);
 assert.equal(result.length,1);assert.equal(result[0].effect.name,'Solid / static overlay');
});
test('successful static fills, Text and Image retain their exact labels',()=>{
 const models=['Fill','Text prop','Image group'].map(Name=>({Name,isActive:1,effectRunning:false}));
 const result=activeOverlays(models,{models:{Fill:{effect:'Solid Color',color:'#00FF00'},'Text prop':{effect:'Text'},'Image group':{effect:'Image'}}});
 assert.deepEqual(result.map(m=>m.effect.name),['Solid Color','Text','Image']);assert.equal(result[0].color,'#00FF00');
});
test('saved history and selected presets cannot create a bubble for disabled output',()=>{
 assert.deepEqual(activeOverlays([{Name:'Tree',isActive:0,effectRunning:false}],{models:{Tree:{effect:'Solid Color',color:'#FF0000'}}}),[]);
 assert.deepEqual(activeOverlays([], {models:{Missing:{effect:'Text'}}}),[]);
});
test('native running names override old static labels',()=>{
 const result=activeOverlays([{Name:'Tree',isActive:1,effectRunning:true,effectName:'WLED - Chase'}],{models:{Tree:{effect:'Solid Color',color:'#FF0000'}}});
 assert.equal(result[0].effect.name,'WLED - Chase');assert.equal(result[0].color,'');
});
test('submodels, groups and transparent static overlays are included and Stop Effects is hidden',()=>{
 const result=activeOverlays([{Name:'Tree_Eyes',isActive:2,effectRunning:false},{Name:'All Props',isActive:'3',effectRunning:false},{Name:'Stopping',isActive:1,effectRunning:true,effectName:'Stop Effects'}]);
 assert.deepEqual(result.map(m=>m.Name),['Tree_Eyes','All Props']);
});
test('missing label storage and malformed label colors do not hide active output',()=>{
 const models=[{Name:'Tree',isActive:1,effectRunning:false}];
 assert.equal(activeOverlays(models,null).length,1);
 assert.equal(activeOverlays(models,{models:{Tree:{effect:'Solid Color',color:'url(javascript:bad)'}}})[0].color,'');
});
