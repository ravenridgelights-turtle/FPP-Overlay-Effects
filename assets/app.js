/* FPP Overlay Effects. GPL-2.0-or-later. */
(function () {
    'use strict';
    const root=document.getElementById('foe'); if(!root) return;
    const C=window.FOECore, $=id=>document.getElementById('foe-'+id);
    const CONFIG='api/configfile/plugin.FPP-Overlay-Effects.json';
    const state={config:C.freshConfig(),models:[],effects:[],index:{models:[],profiles:[]},schema:null,values:[],slot:0,
        connected:false,loading:false,busy:0,armed:false,configReady:false,loadId:0,effectFilter:'all',modelFilter:'all',systems:[],warnings:[]};
    const queue=new C.CommandQueue(); let liveTimer,saveTimer,saveChain=Promise.resolve(),pollTimer;
    root.dataset.panel='colors';
    function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
    function button(label,cls,fn){const b=el('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;}
    function notice(message,kind='info'){$('notice').textContent=message;$('notice').dataset.kind=kind;}
    async function request(path,options={},json=true){
        const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),12000);
        try {
            const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options,signal:abort.signal});
            const raw=await response.text(); let data;
            try{data=JSON.parse(raw);}catch(_){data=raw;}
            if(!response.ok){const e=new Error((typeof data==='object' && data ? data.Message || data.error : String(data).replace(/<[^>]*>/g,'').slice(0,200)) || 'HTTP '+response.status);e.status=response.status;throw e;}
            if(data && typeof data==='object' && (/error|fail/i.test(data.Status || '') || data.error)) throw new Error(data.Message || data.error || 'FPP rejected the request.');
            if(json && (data==null || typeof data!=='object')) throw new Error('FPP returned an invalid response for '+path+'.');
            return data;
        }catch(e){if(e.name==='AbortError')throw new Error('FPP took too long to respond. Check its connection and retry.');throw e;}
        finally{clearTimeout(timeout);}
    }
    function remember(){
        if(state.schema && state.schema.name===state.config.effect) state.config.effectValues[state.schema.name]=Object.fromEntries(state.schema.args.map((a,i)=>[a.name,state.values[i]]));
    }
    function persist(){
        remember();if(!state.configReady)return;
        clearTimeout(saveTimer);$('save-status').textContent='Changes waiting to save…';
        saveTimer=setTimeout(()=>{
            const body=JSON.stringify(state.config);
            saveChain=saveChain.catch(()=>{}).then(()=>request(CONFIG,{method:'POST',headers:{'Content-Type':'application/json'},body})).then(()=>{
                $('save-status').textContent='✓ Saved on this FPP';
            }).catch(e=>{$('save-status').textContent='Settings not saved: '+e.message;});
        },900);
    }
    const selected=()=>state.models.filter(m=>state.config.models.includes(m.Name));
    function mappingError(models){
        for(const m of models){
            if(m.channels>4)return m.label+' uses '+m.channels+' channels per node. Native overlay color control supports the first four; choose an RGB/RGBW model.';
            if(['range','grid'].includes(m.mapping)) {
                const mismatch=m.profiles.map(id=>state.index.profiles.find(p=>p.id===id)).find(p=>p && p.channels!==m.channels);
                if(mismatch)return m.label+' is '+m.channels+' channels per node, but port '+mismatch.port+' / string '+mismatch.string+' uses '+mismatch.channels+'. Correct the overlay model/export, or select separate compatible models.';
            }
        }
        return '';
    }
    function readyError(){
        if(!state.connected)return 'FPP models or effects are unavailable. Refresh to reconnect.';
        if(!selected().length)return 'Select the models, submodels, or groups you want to control.';
        if(state.loading)return 'Effect controls are still loading.';
        const mapping=mappingError(selected());if(mapping)return mapping;
        if(state.config.multisync && !state.config.hosts.length)return 'Choose at least one MultiSync system, or turn MultiSync off.';
        return state.config.effect===C.SOLID ? C.colorValid(state.config.solidColor)?'':'Check the solid color.' : C.validation(state.schema,state.values);
    }
    function updateButtons(){
        const error=readyError();$('apply').disabled=!!error;$('apply').title=error || 'Send this look to selected targets';
        $('stop').disabled=!state.connected || !selected().length;
        $('preset-save').disabled=!!error || !state.configReady;
        $('apply').textContent=state.busy?'● Sending…':'▶ Apply';
        $('selection-summary').textContent=selected().length?selected().length+' selected · '+selected().slice(0,3).map(m=>m.label).join(' · ')+(selected().length>3?' …':''):'Choose the lights to control';
        $('effect-name').textContent=state.config.effect.replace(/^WLED\s*[:\-]?\s*/i,'');
    }
    function scheduleLive(){
        clearTimeout(liveTimer);
        if(state.config.live && state.armed && !readyError())liveTimer=setTimeout(()=>apply(true),180);
    }
    async function postCommand(command){
        const data=await request('api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)},false);
        if(typeof data==='string' && /^(error\b|no command\b|could not\b|no model found\b)/i.test(data.trim()))throw new Error(data);
    }
    async function sendCommands(commands,hosts){
        for(const command of commands){
            await postCommand(command);
            if(hosts.length)await postCommand({...command,multisyncCommand:true,multisyncHosts:hosts.join(',')});
        }
    }
    async function apply(live=false){
        clearTimeout(liveTimer);const error=readyError();if(error){if(!live)notice(error,'error');return;}
        remember();const models=selected(),hosts=state.config.multisync?[...state.config.hosts]:[];
        const visibility=state.config.visibility; let commands;
        try {
            if(state.config.effect===C.SOLID){
                const color=state.config.solidColor,scale=state.config.solidBrightness/255;
                commands=C.groupCommands(models,m=>C.fillCommand([m.Name],visibility,C.targetColor(color,m.channels,scale)));
            }else{
                const schema=state.schema,values=[...state.values];
                commands=C.groupCommands(models,m=>C.effectCommand([m.Name],visibility,schema,values.map((v,i)=>schema.args[i].type==='color'?C.targetColor(v,m.channels):v)));
            }
        }catch(e){notice(e.message,'error');return;}
        state.armed=true;const label=state.config.effect;
        try{
            await queue.enqueue(async()=>{
                state.busy++;updateButtons();notice('Applying '+label+'…');
                try{await sendCommands(commands,hosts);notice(label+' applied to '+models.length+' local target'+(models.length===1?'':'s')+(hosts.length?'; MultiSync commands sent (remote delivery is unacknowledged).':'.'),'success');}
                finally{state.busy--;updateButtons();}
                return true;
            },live?'live':'manual');
        }catch(e){state.armed=false;notice('Could not finish applying: '+e.message+' Some earlier targets may have changed.','error');}
        persist();
    }
    async function stopSelected(){
        clearTimeout(liveTimer);state.armed=false;queue.cancel('live');queue.cancel('manual');
        const models=selected();if(!models.length)return;
        const hosts=state.config.multisync?[...state.config.hosts]:[];
        try{
            await queue.enqueue(async()=>{
                state.busy++;updateButtons();notice('Stopping selected overlays…');try{await sendCommands([C.stopCommand(models.map(m=>m.Name))],hosts);notice('Stopped selected overlays and released '+models.length+' local target'+(models.length===1?'':'s')+' back to the show'+(hosts.length?'; remote stop commands sent.':'.'),'success');}finally{state.busy--;updateButtons();}
            },'stop');
            await pollModels();
        }catch(e){notice('Could not finish stopping selected overlays: '+e.message,'error');}
    }
    function selectedColor(){
        if(state.config.effect===C.SOLID)return state.config.solidColor;
        return state.values[colorArgs()[state.slot]?.index] || '#FFFFFF';
    }
    function colorArgs(){
        if(!state.schema)return [];
        const visible=C.visibleArgs(state.schema,state.values);
        return state.schema.args.map((arg,index)=>({arg,index})).filter(x=>x.arg.type==='color' && visible[x.index]);
    }
    function setColor(hex,commit=false){
        if(!C.colorValid(hex))return;
        if(state.config.effect===C.SOLID)state.config.solidColor=hex.toUpperCase();
        else {const slot=colorArgs()[state.slot];if(!slot)return;state.values[slot.index]=hex.toUpperCase();}
        renderColors();updateButtons();
        if(commit){persist();scheduleLive();}
    }
    const wheel=$('wheel'),ctx=wheel.getContext('2d');
    const wheelBase=document.createElement('canvas');wheelBase.width=300;wheelBase.height=300;
    const baseCtx=wheelBase.getContext('2d'),pixels=baseCtx.createImageData(300,300);
    for(let y=0;y<300;y++)for(let x=0;x<300;x++){
        const dx=x-150,dy=y-150,s=Math.hypot(dx,dy)/135;if(s>1)continue;
        const h=(Math.atan2(dy,dx)*180/Math.PI+90+360)%360;
        const rgb=C.colorParts(C.hsvToHex(h,s,1)),i=(y*300+x)*4;
        pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];pixels.data[i+3]=255;
    }
    baseCtx.putImageData(pixels,0,0);
    function drawWheel(hex){
        const hsv=C.hexToHsv(hex),r=135*hsv.s,a=(hsv.h-90)*Math.PI/180,x=150+Math.cos(a)*r,y=150+Math.sin(a)*r;
        ctx.clearRect(0,0,300,300);ctx.drawImage(wheelBase,0,0);ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='white';ctx.lineWidth=3;ctx.stroke();
        wheel.setAttribute('aria-valuenow',String(Math.round(hsv.h)));wheel.setAttribute('aria-valuetext',hex+', hue '+Math.round(hsv.h)+'°, saturation '+Math.round(hsv.s*100)+'%. Left/right changes hue; up/down changes saturation.');
    }
    let dragging=false;
    function pickWheel(event){
        const rect=wheel.getBoundingClientRect(),x=(event.clientX-rect.left)*300/rect.width-150,y=(event.clientY-rect.top)*300/rect.height-150;
        const hsv=C.hexToHsv(selectedColor()),white=C.colorParts(selectedColor())[3];
        const hex=C.hsvToHex((Math.atan2(y,x)*180/Math.PI+450)%360,Math.min(1,Math.hypot(x,y)/135),hsv.v || 1);
        setColor(selectedColor().length===9?hex+C.colorHex([white]).slice(1):hex);
    }
    wheel.addEventListener('pointerdown',e=>{if(wheel.getAttribute('aria-disabled')==='true')return;const r=wheel.getBoundingClientRect();if(Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)>r.width/2)return;dragging=true;wheel.setPointerCapture(e.pointerId);pickWheel(e);});
    wheel.addEventListener('pointermove',e=>{if(dragging)pickWheel(e);});
    wheel.addEventListener('pointerup',()=>{if(dragging){dragging=false;persist();scheduleLive();}});
    wheel.addEventListener('pointercancel',()=>{dragging=false;});
    wheel.addEventListener('keydown',e=>{if(wheel.getAttribute('aria-disabled')==='true' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const hsv=C.hexToHsv(selectedColor()),p=C.colorParts(selectedColor());if(e.key==='ArrowLeft')hsv.h-=3;if(e.key==='ArrowRight')hsv.h+=3;if(e.key==='ArrowUp')hsv.s=C.clamp(hsv.s+.04,0,1);if(e.key==='ArrowDown')hsv.s=C.clamp(hsv.s-.04,0,1);const rgb=C.hsvToHex(hsv.h,hsv.s,hsv.v || 1);setColor(selectedColor().length===9?rgb+C.colorHex([p[3]]).slice(1):rgb,true);});
    function renderColors(){
        const args=colorArgs(),solid=state.config.effect===C.SOLID,has=solid || args.length>0;
        state.slot=Math.max(0,Math.min(state.slot,args.length-1));
        const mono=selected().length>0 && selected().every(m=>m.channels===1);
        $('color-slots').replaceChildren();
        (solid?[{arg:{label:'Solid'},index:-1}]:args).forEach((v,i)=>{
            const hex=solid?state.config.solidColor:state.values[v.index];
            const b=button(String(i+1),'foe-slot',()=>{state.slot=i;renderColors();});b.title=v.arg.label;b.setAttribute('aria-label',v.arg.label);b.setAttribute('aria-pressed',String(i===state.slot));b.style.backgroundColor=C.colorValid(hex)?hex.slice(0,7):'#111';$('color-slots').append(b);
        });
        $('color-label').textContent=solid?'Solid fill':args[state.slot]?.arg.label || 'Palette driven';
        $('no-colors').hidden=has && !mono;$('no-colors').textContent=mono?'Single-channel targets: use Color level and Brightness to dim them.':"This effect generates its own colors. Its palette and other controls are in Effects.";
        const hex=C.colorValid(selectedColor())?selectedColor():'#FFFFFF',parts=C.colorParts(hex),hsv=C.hexToHsv(hex);
        wheel.parentElement.hidden=!has || mono;wheel.setAttribute('aria-disabled',String(!has || mono));wheel.tabIndex=has && !mono?0:-1;
        $('swatches').hidden=!has || mono;$('hex').disabled=!has || mono;$('native-color').disabled=!has || mono;$('copy-color').disabled=!has;
        $('hex').value=mono?C.targetColor(hex,1):hex;$('native-color').value=hex.slice(0,7);drawWheel(hex);
        $('color-level-row').hidden=!has;$('color-level').value=String(Math.round(hsv.v*100));$('color-level-value').textContent=Math.round(hsv.v*100)+'%';
        $('white-row').hidden=!has || !selected().some(m=>m.channels===4);$('white').value=String(parts[3]);$('white-value').textContent=String(parts[3]);
        const colors=solid?[state.config.solidColor]:args.map(a=>state.values[a.index]).filter(C.colorValid);
        $('color-preview').style.background=colors.length?'linear-gradient(90deg,'+(colors.length===1?[colors[0],colors[0]]:colors).map(x=>x.slice(0,7)).join(',')+')':'#34363c';
    }
    function updateArg(index,value,commit){
        state.values[index]=String(value);updateButtons();
        const visibility=C.visibleArgs(state.schema,state.values);
        $('arguments').querySelectorAll('[data-arg]').forEach(n=>n.hidden=!visibility[Number(n.dataset.arg)]);
        if(commit){renderColors();persist();scheduleLive();}
    }
    function numericControl(arg,value,onChange){
        const row=el('label','foe-control'),heading=el('span','',arg.label),out=el('output','',value);
        heading.append(out);row.append(heading);const pair=el('div','foe-numeric');
        const input=el('input','foe-number');input.type='number';input.min=arg.min;input.max=arg.max;input.step=arg.type==='float'?'any':'1';input.value=value;input.setAttribute('aria-label',arg.label+' value');
        const slider=el('input');slider.type='range';slider.min=arg.min;slider.max=arg.max;slider.step=arg.type==='float'?'0.01':'1';slider.value=value;slider.setAttribute('aria-label',arg.label);
        input.addEventListener('input',()=>{slider.value=input.value;out.textContent=input.value;onChange(input.value,false);});input.addEventListener('change',()=>onChange(input.value,true));
        slider.addEventListener('input',()=>{input.value=slider.value;out.textContent=slider.value;onChange(slider.value,false);});slider.addEventListener('change',()=>onChange(slider.value,true));
        pair.append(slider,input);row.append(pair);if(arg.help)row.title=String(arg.help).replace(/<[^>]*>/g,' ');return row;
    }
    function renderArguments(){
        const form=$('arguments'),brightness=$('brightness');form.replaceChildren();brightness.replaceChildren();
        if(state.config.effect===C.SOLID){form.append(el('p','foe-help','Solid Color uses FPP’s Overlay Model Fill command. Choose a color, select your targets, and Apply.'));
            brightness.append(numericControl({label:'Brightness',min:0,max:255,type:'range'},String(state.config.solidBrightness),(v,commit)=>{state.config.solidBrightness=C.clamp(v,0,255);if(commit){persist();scheduleLive();}}));renderColors();updateButtons();return;}
        if(!state.schema){form.append(el('p','foe-help',state.loading?'Loading this effect’s controls…':'Select an effect or refresh to retry loading its controls.'));renderColors();updateButtons();return;}
        const shown=C.visibleArgs(state.schema,state.values);let section='';
        state.schema.args.forEach((a,i)=>{
            if(a.type==='color')return;
            let row;
            if(['range','int','float'].includes(a.type))row=numericControl(a,state.values[i],(v,commit)=>updateArg(i,v,commit));
            else {
                row=el('label','foe-control');const label=el('span','',a.label);row.append(label);let input;
                if(a.type==='bool'){input=el('input');input.type='checkbox';input.checked=['1','true'].includes(state.values[i]);label.prepend(input);input.addEventListener('change',()=>updateArg(i,String(input.checked),true));}
                else if(a.choices.length || a.contentListUrl){input=el('select');if(a.allowBlanks){const opt=el('option','','—');opt.value='';input.append(opt);}for(const choice of a.choices){const opt=el('option','',choice);opt.value=choice;input.append(opt);}input.value=state.values[i];input.addEventListener('change',()=>updateArg(i,input.value,true));row.append(input);}
                else {input=el(a.name.toLowerCase().includes('text')?'textarea':'input');if(input.tagName==='INPUT')input.type='text';input.value=state.values[i];input.addEventListener('input',()=>updateArg(i,input.value,false));input.addEventListener('change',()=>updateArg(i,input.value,true));row.append(input);}
                input.setAttribute('aria-label',a.label);if(a.help)row.title=String(a.help).replace(/<[^>]*>/g,' ');
            }
            row.dataset.arg=String(i);row.hidden=!shown[i];
            if(/^brightness$/i.test(a.name) || /^brightness$/i.test(a.label)){brightness.append(row);return;}
            if(a.section && a.section!==section){section=a.section;form.append(el('h4','foe-arg-section',section));}
            form.append(row);
        });
        if(!form.children.length)form.append(el('p','foe-help','Use the color slots and brightness controls for this effect.'));
        renderColors();updateButtons();
    }
    async function loadSchema(name){
        const schema=C.normalizeSchema(await request('api/overlays/effects/'+encodeURIComponent(name)),name);
        for(const a of schema.args){if(a.contentListUrl){const data=await request(C.safeApiPath(a.contentListUrl));a.choices=C.list(data).filter(v=>typeof v==='string');if(!a.choices.includes(a.default) && a.choices.length)a.default=a.allowBlanks?'':a.choices[0];}}
        return schema;
    }
    async function chooseEffect(name,{parameters,auto=false}={}){
        remember();clearTimeout(liveTimer);queue.cancel('live');const id=++state.loadId;
        state.config.effect=name;state.schema=null;state.values=[];state.slot=0;state.loading=name!==C.SOLID;
        renderEffects();renderArguments();
        try{
            if(name!==C.SOLID){const schema=await loadSchema(name);if(id!==state.loadId)return;state.schema=schema;state.values=C.defaults(schema,parameters || state.config.effectValues[name]);}
            if(id!==state.loadId)return;state.loading=false;renderArguments();persist();
            const error=readyError();if(error && selected().length)notice(error,'info');
            if(auto)scheduleLive();
        }catch(e){if(id!==state.loadId)return;state.loading=false;state.armed=false;renderArguments();notice('Could not load effect controls: '+e.message,'error');}
    }
    function renderEffects(){
        const search=$('effect-search').value.toLowerCase(),filter=state.effectFilter;
        const names=[C.SOLID,...state.effects.filter(n=>n!=='Stop Effects' && n!==C.SOLID)];
        const filtered=names.filter(n=>n.toLowerCase().includes(search) && (filter==='all' || filter==='wled' && /WLED/i.test(n) || filter==='native' && !/WLED/i.test(n) || filter==='favorites' && state.config.favorites.includes(n)));
        const pane=$('effects');pane.replaceChildren();$('effect-count').textContent=filtered.length+' effects';
        filtered.forEach(name=>{
            const row=el('div','foe-effect-item');row.dataset.selected=String(name===state.config.effect);
            const choice=button(name.replace(/^WLED\s*[:\-]?\s*/i,''),'foe-effect-choice',()=>chooseEffect(name,{auto:true}));choice.title=name;choice.setAttribute('aria-pressed',String(name===state.config.effect));
            const star=button('★','foe-star',()=>{state.config.favorites=state.config.favorites.includes(name)?state.config.favorites.filter(n=>n!==name):[...state.config.favorites,name];renderEffects();persist();});star.setAttribute('aria-label','Favorite '+name);star.setAttribute('aria-pressed',String(state.config.favorites.includes(name)));row.append(choice,star);pane.append(row);
        });if(!filtered.length)pane.append(el('p','foe-help','No effects match this filter.'));
    }
    function modelLabel(m){
        const label=el('label','foe-model-row');label.dataset.selected=String(state.config.models.includes(m.Name));
        const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=state.config.models.includes(m.Name);checkbox.disabled=m.disabled;checkbox.setAttribute('aria-label','Select '+m.Name);
        checkbox.addEventListener('change',()=>{state.config.models=checkbox.checked?C.unique([...state.config.models,m.Name]):state.config.models.filter(n=>n!==m.Name);selectionChanged();});
        const text=el('div');text.append(el('span','foe-model-name',m.label));
        const meta=el('span','foe-model-meta'),kind={model:'Model',submodel:'Submodel',group:'Model group',buffer:'Buffer view'}[m.kind] || m.kind;
        meta.textContent=kind+' · '+(m.channels===1?'Single channel':m.channels===4?'RGBW':m.channels===3?'RGB':m.channels+' ch/node');
        if(m.effectRunning)meta.textContent+=' · '+(m.effectName || 'Effect running');else if(Number(m.isActive)>0)meta.textContent+=' · Overlay enabled';
        if(m.disabled)meta.textContent+=' · Comma in name: rename in FPP';text.append(meta);label.append(checkbox,text);return label;
    }
    function visibleModels(){const query=$('model-search').value.toLowerCase();return state.models.filter(m=>(state.modelFilter==='all' || m.kind===state.modelFilter) && (m.Name+' '+m.label+' '+m.parent).toLowerCase().includes(query));}
    function renderModels(){
        const pane=$('models'),models=visibleModels();pane.replaceChildren();$('model-count').textContent=state.config.models.length+' / '+state.models.length;
        const parentGroups=new Map();
        models.forEach(m=>{if(m.kind==='submodel' && m.parent){if(!parentGroups.has(m.parent))parentGroups.set(m.parent,[]);parentGroups.get(m.parent).push(m);}else pane.append(modelLabel(m));});
        parentGroups.forEach((subs,parent)=>{const details=el('details','foe-model-group');details.open=!!$('model-search').value || subs.some(m=>state.config.models.includes(m.Name));const summary=el('summary','',parent+' · submodels'),count=el('span','',String(subs.length));summary.append(count);details.append(summary);subs.forEach(m=>details.append(modelLabel(m)));pane.append(details);});
        if(!models.length)pane.append(el('p','foe-help',state.models.length?'No targets match this filter.':'No overlay models found. Configure models in FPP’s Pixel Overlay Models page, then refresh.'));
        renderOutputInfo();
    }
    function renderOutputInfo(){
        const pane=$('output-info');pane.replaceChildren();const targets=selected();
        if(!targets.length)pane.append(el('p','','Select a target to see its configured outputs.'));
        targets.forEach(m=>{const div=el('div','foe-output-target');div.append(el('b','',m.label));const profiles=m.profiles.map(id=>state.index.profiles.find(p=>p.id===id)).filter(Boolean);
            div.append(el('p','',m.channels+' channels/node · '+(m.ColorOrder || (m.channels===4?'RGBW':m.channels===1?'W':'RGB'))+' channel data'));
            profiles.forEach(p=>div.append(el('p','','Port '+p.port+' / receiver '+p.receiver+' / string '+p.string+' · '+p.protocol+' · '+p.order+' wire order'+(p.description?' · '+p.description:''))));
            if(m.mapping==='parent')div.append(el('p','','Inherited from parent '+m.parent+'; port list may include other parts of that parent.'));
            if(!profiles.length)div.append(el('p','','Hardware mapping unavailable here. Network controller color order and pixel protocol must be configured on that controller.'));
            const error=mappingError([m]);if(error)div.append(el('p','foe-type-warning',error));pane.append(div);
        });
        const overlap=targets.some(m=>m.parent && targets.some(parent=>parent.Name===m.parent));
        $('overlap').hidden=!overlap;$('overlap').textContent='A parent and its submodel are both selected. Their pixels overlap; choose one level when running independent effects.';
    }
    function selectionChanged(){
        clearTimeout(liveTimer);queue.cancel('live');state.armed=false;renderModels();renderColors();updateButtons();persist();
        const error=mappingError(selected());if(error)notice(error,'error');else notice(selected().length?'Targets changed. Press Apply to use this selection.':'Choose the lights you want to control.');
    }
    function renderPresets(){
        const pane=$('presets');pane.replaceChildren();
        state.config.presets.forEach((preset,i)=>{const row=el('div','foe-preset'),load=button(preset.name,'',async()=>{
            state.armed=false;state.config.models=C.list(preset.models).filter(n=>state.models.some(m=>m.Name===n));state.config.visibility=['Enabled','Transparent','Transparent RGB'].includes(preset.visibility)?preset.visibility:'Enabled';
            state.config.solidColor=C.colorValid(preset.solidColor || '')?preset.solidColor:'#FF6600';state.config.solidBrightness=C.clamp(preset.solidBrightness ?? 128,0,255);$('visibility').value=state.config.visibility;
            if(preset.effect!==C.SOLID && !state.effects.includes(preset.effect)){notice('This preset’s effect is not available on this FPP.','error');return;}
            await chooseEffect(preset.effect,{parameters:preset.parameters || {}});renderModels();updateButtons();
            const missing=C.list(preset.models).length-state.config.models.length;
            notice('Loaded '+preset.name+'. Review the targets and press Apply.'+(missing?' '+missing+' saved target(s) are missing.':''));
        });load.setAttribute('aria-label','Load preset '+preset.name);load.append(el('small','',preset.effect+' · '+C.list(preset.models).length+' targets'));
            const remove=button('×','',()=>{state.config.presets.splice(i,1);renderPresets();persist();});remove.setAttribute('aria-label','Delete preset '+preset.name);row.append(load,remove);pane.append(row);
        });if(!state.config.presets.length)pane.append(el('p','foe-help','Save a favorite color or effect together with its targets and settings.'));
    }
    function renderSystems(){
        const pane=$('systems');pane.replaceChildren();state.systems.forEach(system=>{const row=el('label','foe-system'),input=el('input');input.type='checkbox';input.checked=state.config.hosts.includes(system.address);input.addEventListener('change',()=>{state.config.hosts=input.checked?C.unique([...state.config.hosts,system.address]):state.config.hosts.filter(h=>h!==system.address);state.armed=false;updateButtons();persist();});row.append(input,document.createTextNode((system.hostname || system.address)+' ('+system.address+')'));pane.append(row);});if(!state.systems.length)pane.append(el('p','foe-help','No MultiSync systems were reported. Local control is available.'));
    }
    async function refresh(initial=false){
        clearTimeout(liveTimer);queue.cancel('live');state.armed=false;state.connected=false;state.loading=true;updateButtons();$('refresh').disabled=true;
        const paths=['api/overlays/models','api/models?simple=true&submodels=true','plugin.php?plugin=FPP-Overlay-Effects&page=model-index.php&nopage=1','api/overlays/effects','api/fppd/multiSyncSystems'];
        if(initial)paths.push(CONFIG);
        const responses=await Promise.allSettled(paths.map(p=>request(p)));
        const result=i=>responses[i].status==='fulfilled'?responses[i].value:null;
        try{
            if(initial){
                if(result(5)){state.config=C.freshConfig(result(5));state.configReady=true;}
                else if(responses[5].reason?.status===404){state.config=C.freshConfig();state.configReady=true;}
                else {state.configReady=false;notice('Saved settings could not be read. Controls remain usable, but saving is disabled to protect existing presets.','error');}
            }
            state.index=result(2) || {models:[],profiles:[]};state.index.profiles=C.list(state.index.profiles);
            if(!Array.isArray(result(0)) && !Array.isArray(result(1)))throw new Error('FPP did not return a model list. Check that fppd is running.');
            state.models=C.normalizeModels(result(0),result(1),state.index);
            if(!Array.isArray(result(3)))throw new Error('FPP did not return an effect list.');
            state.effects=C.unique(result(3).map(v=>typeof v==='string'?v:v?.name).filter(n=>typeof n==='string')).sort((a,b)=>a.localeCompare(b));
            state.config.models=state.config.models.filter(n=>state.models.some(m=>m.Name===n && !m.disabled));
            state.systems=C.list(result(4)?.systems).filter(s=>typeof s.address==='string' && /^[a-z\d.:[\]-]+$/i.test(s.address));
            state.systems=state.systems.filter((s,i,a)=>a.findIndex(v=>v.address===s.address)===i);
            state.config.hosts=state.config.hosts.filter(h=>state.systems.some(s=>s.address===h));
            if(state.config.effect!==C.SOLID && !state.effects.includes(state.config.effect))state.config.effect=C.SOLID;
            state.connected=true;state.loading=false;$('connection').textContent='FPP connected';$('connection').dataset.state='online';
            $('visibility').value=state.config.visibility;$('live').checked=state.config.live;$('multisync').checked=state.config.multisync;
            renderModels();renderEffects();renderPresets();renderSystems();await chooseEffect(state.config.effect);
            const warnings=[];if(!result(2))warnings.push('Pixel-output metadata is unavailable; submodel names still come from FPP’s discovery API.');if(!result(1))warnings.push('Lazy submodel discovery is unavailable. Only loaded and indexed targets are shown.');
            if(state.configReady && state.schema || state.configReady && state.config.effect===C.SOLID)notice(warnings.length?warnings.join(' '):'Ready. Select your lights, choose a look, then press Apply.');
        }catch(e){state.connected=false;state.loading=false;$('connection').textContent='Unavailable';$('connection').dataset.state='error';notice(e.message,'error');}
        finally{$('refresh').disabled=false;updateButtons();}
    }
    async function pollModels(){
        if(document.hidden || !state.connected)return;
        try{const data=await request('api/overlays/models');if(Array.isArray(data)){const next=new Map(data.map(m=>[m.Name,m]));state.models=state.models.map(m=>({...m,...(next.get(m.Name) || {})}));renderModels();}}
        catch(_){/* Explicit actions report failures; a status poll must not erase edits. */}
    }
    $('apply').addEventListener('click',()=>apply());$('stop').addEventListener('click',stopSelected);$('refresh').addEventListener('click',()=>refresh());
    $('live').addEventListener('change',()=>{state.config.live=$('live').checked;state.armed=false;clearTimeout(liveTimer);queue.cancel('live');persist();notice(state.config.live?'Live changes are on. Press Apply once to arm them for the current targets.':'Live changes are off. Press Apply to send your edits.');});
    $('multisync').addEventListener('change',()=>{state.config.multisync=$('multisync').checked;state.armed=false;updateButtons();persist();});
    $('visibility').addEventListener('change',()=>{state.config.visibility=$('visibility').value;persist();scheduleLive();});
    $('arguments').addEventListener('submit',e=>{e.preventDefault();apply();});
    $('defaults').addEventListener('click',()=>{if(state.schema)state.values=C.defaults(state.schema);else {state.config.solidColor='#FF6600';state.config.solidBrightness=128;}renderArguments();persist();scheduleLive();});
    $('hex').addEventListener('change',()=>{const value=$('hex').value.trim();if(C.colorValid(value))setColor(value,true);else notice('Use #RRGGBB or #RRGGBBWW for a color.','error');});
    $('native-color').addEventListener('input',()=>{const white=C.colorParts(selectedColor())[3];setColor($('native-color').value+(selectedColor().length===9?C.colorHex([white]).slice(1):''));});
    $('native-color').addEventListener('change',()=>{persist();scheduleLive();});
    $('color-level').addEventListener('input',()=>{const h=C.hexToHsv(selectedColor()),p=C.colorParts(selectedColor());setColor(C.hsvToHex(h.h,h.s,Number($('color-level').value)/100)+(selectedColor().length===9?C.colorHex([p[3]]).slice(1):''));});
    $('color-level').addEventListener('change',()=>{persist();scheduleLive();});
    $('white').addEventListener('input',()=>{const p=C.colorParts(selectedColor());p[3]=Number($('white').value);setColor(C.colorHex(p,true));});$('white').addEventListener('change',()=>{persist();scheduleLive();});
    $('copy-color').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(selectedColor());notice('Color copied.');}catch(_){$('hex').focus();$('hex').select();notice('Select and copy the hex value.');}});
    ['#FF0000','#FF8000','#FFFF00','#00FF00','#00FFFF','#0000FF','#FF00FF','#FFFFFF','#000000'].forEach(hex=>{const b=button('','foe-swatch',()=>setColor(hex,true));b.style.backgroundColor=hex;b.setAttribute('aria-label','Set color '+hex);$('swatches').append(b);});
    $('effect-search').addEventListener('input',renderEffects);$('model-search').addEventListener('input',renderModels);
    for(const kind of ['effect','model'])$(kind+'-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state[kind+'Filter']=b.dataset.filter;$(kind+'-filters').querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));if(kind==='effect')renderEffects();else renderModels();});
    $('select-visible').addEventListener('click',()=>{state.config.models=C.unique([...state.config.models,...visibleModels().filter(m=>!m.disabled).map(m=>m.Name)]);selectionChanged();});
    $('clear-selection').addEventListener('click',()=>{state.config.models=[];selectionChanged();});
    $('preset-save').addEventListener('click',()=>{const error=readyError();if(error){notice(error,'error');return;}const name=$('preset-name').value.trim();if(!name){$('preset-name').focus();notice('Enter a name for this preset.');return;}remember();const preset={name,models:[...state.config.models],effect:state.config.effect,visibility:state.config.visibility,solidColor:state.config.solidColor,solidBrightness:state.config.solidBrightness,parameters:state.schema?Object.fromEntries(state.schema.args.map((a,i)=>[a.name,state.values[i]])):{}};const existing=state.config.presets.findIndex(p=>p.name===name);if(existing>=0)state.config.presets[existing]=preset;else state.config.presets.push(preset);$('preset-name').value='';renderPresets();persist();notice('Preset '+name+' saved.');});
    root.querySelector('.foe-mobile-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-panel]');if(!b)return;root.dataset.panel=b.dataset.panel;root.querySelectorAll('.foe-mobile-tabs button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(liveTimer);queue.cancel('live');state.armed=false;}else pollModels();});
    async function pollLoop(){await pollModels();pollTimer=setTimeout(pollLoop,8000);}
    refresh(true).then(()=>{pollTimer=setTimeout(pollLoop,8000);});
    window.addEventListener('pagehide',()=>{clearTimeout(pollTimer);clearTimeout(liveTimer);});
})();
