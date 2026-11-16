/* Active output is determined by FPP, never by saved command history alone. */
(function(root,factory){
    const api=factory();
    if(typeof module==='object' && module.exports)module.exports=api;else root.FOEStatus=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const yes=v=>v===true || v===1 || v==='1' || v==='true';
    function activeOverlays(models,activity){
        if(!Array.isArray(models))return [];
        const saved=activity && typeof activity.models==='object' && activity.models?activity.models:{};
        return models.flatMap(m=>{
            if(!m || typeof m.Name!=='string' || !m.Name || !(Number(m.isActive)>0))return [];
            const running=Object.hasOwn(m,'effectRunning')?yes(m.effectRunning):yes(m.isLocked);
            if(running && m.effectName==='Stop Effects')return [];
            const prior=Object.hasOwn(saved,m.Name)?saved[m.Name]:null;
            const previous=prior && typeof prior.effect==='string' && prior.effect.trim()?prior.effect:'';
            const name=running && typeof m.effectName==='string' && m.effectName?m.effectName:previous || (running?'Overlay effect':'Solid / static overlay');
            const color=prior && prior.effect===name && typeof prior.color==='string' && /^#[\da-f]{6}([\da-f]{2})?$/i.test(prior.color)?prior.color:'';
            return [{...m,effect:{name},color,static:!running}];
        });
    }
    return {activeOverlays};
});
