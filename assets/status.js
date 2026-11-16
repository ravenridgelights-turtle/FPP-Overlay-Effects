/* Active effects only. FPP Overlay Effects, GPL-2.0-or-later. */
(() => {
    'use strict';
    function init(){
        if(document.getElementById('foe-status-overlays'))return;
        const player=document.querySelector('#playerStatusTop .playerStatusRow');
        const remote=document.querySelector('#remoteModeInfo .statusTable');
        if(!player && !remote)return;
        const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
        const panel=node('section');panel.id='foe-status-overlays';panel.hidden=true;panel.setAttribute('aria-label','Running overlay effects');
        const heading=node('div','foe-status-heading'),label=node('span','foe-status-label','● Overlay effects');
        const link=node('a','','Effect controls');link.href='plugin.php?plugin=FPP-Overlay-Effects&page=overlay-effects.php';
        const stopAll=node('button','foe-status-stop','Stop shown');stopAll.type='button';stopAll.setAttribute('aria-label','Stop all shown overlay effects');
        const actions=node('div','foe-status-actions');actions.append(link,stopAll);heading.append(label,actions);
        const bubbles=node('div','foe-status-bubbles'),error=node('p','foe-status-error');error.hidden=true;error.setAttribute('role','status');panel.append(heading,bubbles,error);
        let timer,controller,generation=0,current=[],busy=new Set(),disposed=false,hash='';
        function mount(){const anchor=remote && remote.closest('#remoteModeInfo').getClientRects().length?remote:player || remote;if(panel.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',panel);}
        mount();
        function render(models){
            current=models;panel.hidden=models.length===0;label.textContent='● Overlay effects · '+models.length;
            if(!models.length){bubbles.replaceChildren();hash='';return;}
            const next=JSON.stringify([models.map(m=>[m.Name,m.effect.name,m.DisplayName]),[...busy]]);if(next===hash)return;hash=next;bubbles.replaceChildren();
            models.forEach(m=>{
                const bubble=node('div','foe-status-bubble'),dot=node('span','foe-status-dot');dot.setAttribute('aria-hidden','true');
                const text=node('div','foe-status-copy'),prop=node('strong','',m.DisplayName || m.Name),effect=node('span','',m.effect.name.replace(/^WLED\s*[:\-]?\s*/i,''));
                text.append(prop,effect);
                const stop=node('button','foe-status-stop',busy.has(m.Name)?'Stopping…':'Stop');stop.type='button';stop.disabled=busy.has(m.Name);stop.title='Stop '+m.Name+' and release its overlay';stop.setAttribute('aria-label','Stop overlay on '+m.Name);stop.addEventListener('click',()=>stopTargets([m.Name]));
                bubble.append(dot,text,stop);bubbles.append(bubble);
            });stopAll.hidden=models.length<2;stopAll.disabled=busy.size>0;
        }
        async function read(){
            clearTimeout(timer);timer=null;if(document.hidden || disposed || controller)return;
            const mine=++generation,request=new AbortController();controller=request;const timeout=setTimeout(()=>request.abort(),6000);
            try{
                const response=await fetch('api/overlays/running',{credentials:'same-origin',cache:'no-store',signal:request.signal});
                if(!response.ok)throw new Error('Status unavailable');const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid overlay status');
                if(mine!==generation)return;mount();render(data.filter(m=>typeof m.Name==='string' && m.Name && m.effect && typeof m.effect.name==='string' && m.effect.name && m.effect.name!=='Stop Effects'));
            }catch(_){if(mine===generation){render([]);}}
            finally{clearTimeout(timeout);if(controller===request)controller=null;if(mine===generation && !document.hidden && !disposed)timer=setTimeout(read,current.length?3000:8000);}
        }
        async function stopTargets(names){
            if(!names.length || names.some(n=>!n || n.includes(',')))return;
            generation++;if(controller){controller.abort();controller=null;}clearTimeout(timer);names.forEach(n=>busy.add(n));error.hidden=true;render(current);
            const request=new AbortController(),timeout=setTimeout(()=>request.abort(),8000);
            try{
                const response=await fetch('api/command',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'Overlay Model Effect',args:[names.join(','),'Enabled','Stop Effects'],multisyncCommand:false}),signal:request.signal});
                const raw=await response.text();if(!response.ok)throw new Error(raw.replace(/<[^>]*>/g,'').slice(0,160) || 'Stop command failed.');
                let data;try{data=JSON.parse(raw);}catch(_){}if(data && /error|fail/i.test(data.Status || ''))throw new Error(data.Message || 'Stop command failed.');
                if(/^(error\b|no model found\b|could not\b|no command\b)/i.test(raw.trim()))throw new Error(raw);
            }catch(e){error.textContent=e.name==='AbortError'?'Stop timed out. Check FPP and try again.':'Could not stop overlay: '+e.message;error.hidden=false;}
            finally{clearTimeout(timeout);names.forEach(n=>busy.delete(n));await read();}
        }
        stopAll.addEventListener('click',()=>stopTargets(current.map(m=>m.Name)));
        function changed(){if(document.hidden){generation++;clearTimeout(timer);if(controller)controller.abort();controller=null;return;}mount();if(!timer && !controller)read();}
        if(typeof window.OnSystemStatusChange==='function')window.OnSystemStatusChange(changed);
        document.addEventListener('visibilitychange',changed);
        window.addEventListener('pagehide',()=>{disposed=true;generation++;clearTimeout(timer);if(controller)controller.abort();});
        window.addEventListener('pageshow',()=>{if(disposed){disposed=false;read();}});
        read();
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
