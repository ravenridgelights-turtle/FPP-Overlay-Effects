/* FPP Overlay Effects. GPL-2.0-or-later. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.FOECore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const SOLID = 'Solid Color';
    const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v)));
    const list = v => Array.isArray(v) ? v : [];
    const unique = v => [...new Set(v)];
    const colorValid = v => /^#[\da-f]{6}([\da-f]{2})?$/i.test(v);
    const byte = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
    function colorParts(hex) {
        if (!colorValid(hex)) throw new Error('Enter a color as #RRGGBB or #RRGGBBWW.');
        return [1, 3, 5, 7].map(i => parseInt(hex.slice(i, i + 2) || '00', 16));
    }
    function colorHex(parts, white = false) {
        return '#' + parts.slice(0, white ? 4 : 3).map(byte).join('').toUpperCase();
    }
    function hsvToHex(h, s, v) {
        const hue = ((h % 360) + 360) % 360 / 60;
        const c = v * s, x = c * (1 - Math.abs(hue % 2 - 1)), m = v - c;
        const rgb = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(hue)];
        return colorHex(rgb.map(n => (n + m) * 255));
    }
    function hexToHsv(hex) {
        const [r,g,b] = colorParts(hex).map(n => n / 255);
        const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
        let h = !d ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return {h:(h * 60 + 360) % 360, s:max ? d / max : 0, v:max};
    }
    // Hardware wire order is applied by FPP's output driver. Never permute RGB here.
    function targetColor(hex, channels, scale = 1) {
        const p = colorParts(hex).map(n => n * scale);
        if (Number(channels) === 1) {
            const level = Math.max(...p);
            return colorHex([level,level,level]);
        }
        return colorHex(p, Number(channels) >= 4 && hex.length === 9);
    }
    function safeApiPath(path) {
        if (typeof path !== 'string' || /[\\#]|%2e|%2f|%5c/i.test(path)) throw new Error('Invalid FPP choice URL.');
        const trimmed = path.replace(/^\/(?!\/)/, '');
        if (!trimmed.startsWith('api/') || trimmed.split(/[/?]/).some(p => p === '..' || p === '.')) throw new Error('Invalid FPP choice URL.');
        return trimmed;
    }
    function normalizeSchema(data, expected) {
        if (!data || typeof data.name !== 'string' || !data.name || (expected && data.name !== expected)) throw new Error('FPP did not return the requested effect description. Refresh and retry.');
        if (data.args != null && !Array.isArray(data.args)) throw new Error('FPP returned invalid effect arguments.');
        return {name:data.name, description:data.description || '', args:list(data.args).map((arg,i) => {
            const type = String(arg.type || 'string').toLowerCase();
            const choices = list(arg.contents).map(String);
            const min = Number.isFinite(Number(arg.min)) ? Number(arg.min) : 0;
            const max = Number.isFinite(Number(arg.max)) ? Number(arg.max) : 255;
            const fallback = choices.length ? choices[0] : type === 'bool' ? 'false' : type === 'color' ? '#FF0000' : ['range','int','float'].includes(type) ? String(min) : '';
            return {...arg, name:String(arg.name || 'arg'+i), label:String(arg.description || arg.name || 'Value'), type,
                choices, min, max, default:arg.default != null ? String(arg.default) : fallback};
        })};
    }
    function defaults(schema, remembered = {}) {
        return schema.args.map(a => Object.hasOwn(remembered,a.name) ? String(remembered[a.name]) : a.default);
    }
    function visibleArgs(schema, values) {
        const children = new Set(), shown = new Set();
        schema.args.forEach((a,i) => {
            Object.values(a.children || {}).forEach(names => list(names).forEach(n=>children.add(n)));
            list((a.children || {})[values[i]]).forEach(n=>shown.add(n));
        });
        return schema.args.map(a => !children.has(a.name) || shown.has(a.name));
    }
    function validation(schema, values) {
        if (!schema || values.length !== schema.args.length) return 'Effect controls are still loading.';
        const visible = visibleArgs(schema,values);
        for (let i=0; i<schema.args.length; i++) {
            const a = schema.args[i], v = values[i];
            if (typeof v !== 'string') return 'Check '+a.label+'.';
            if (!visible[i] || (a.optional && !v)) continue;
            if (a.choices.length && !a.choices.includes(v) && !(a.allowBlanks && !v)) return 'Choose '+a.label+'.';
            if (a.type === 'color' && !colorValid(v)) return 'Check '+a.label+'.';
            if (['range','int','float'].includes(a.type) && (!v.trim() || !Number.isFinite(Number(v)) || Number(v)<a.min || Number(v)>a.max || (a.type!=='float' && !Number.isInteger(Number(v))))) return 'Check '+a.label+' ('+a.min+'–'+a.max+').';
            if (a.type === 'bool' && !['0','1','true','false'].includes(v)) return 'Check '+a.label+'.';
            if (!a.optional && a.contentListUrl && !v && !a.allowBlanks) return 'Choose '+a.label+'.';
        }
        return '';
    }
    function modelTargets(models) {
        if (!models.length) throw new Error('Select at least one model, submodel, or group.');
        if (models.some(n=>!n || n.includes(',') || n==='--All Models--')) throw new Error('FPP command model names cannot contain commas.');
        return unique(models).join(',');
    }
    function effectCommand(models, visibility, schema, values) {
        const error = validation(schema,values); if(error) throw new Error(error);
        return {command:'Overlay Model Effect', args:[modelTargets(models),visibility,schema.name,...values],multisyncCommand:false};
    }
    function stopCommand(models) {
        return {command:'Overlay Model Effect', args:[modelTargets(models),'Enabled','Stop Effects'],multisyncCommand:false};
    }
    function fillCommand(models, visibility, color) {
        if (!colorValid(color)) throw new Error('Check the fill color.');
        return {command:'Overlay Model Fill',args:[modelTargets(models),visibility.replace('Transparent RGB','TransparentRGB'),color],multisyncCommand:false};
    }
    function normalizeModels(runtime, names, index) {
        const map = new Map();
        const add = (m,source) => {
            const obj = typeof m==='string' ? {Name:m} : m;
            const name = obj?.Name || obj?.name;
            if(typeof name!=='string' || !name || name==='--All Models--') return;
            const prev=map.get(name) || {Name:name};
            map.set(name,{...prev,...obj,_source:source});
        };
        list(index?.models).forEach(m=>add(m,'index'));
        list(names).forEach(m=>add(m,'names'));
        list(runtime).forEach(m=>add(m,'runtime'));
        const result = [...map.values()].map(m => {
            const meta=list(index?.models).find(x=>x.Name===m.Name) || {};
            const kind=meta.kind || (m.BufferStyle ? 'buffer' : m.Type==='Sub' ? 'submodel' : 'model');
            let profiles=list(meta.profiles), mapping=meta.mapping || 'unknown';
            // Auto-created channel-output models may not be in model-overlays.json.
            // Join their live API range to the same read-only string profiles.
            const start=Number(m.StartChannel)-1,count=Number(m.ChannelCount);
            if(!profiles.length && m.Type==='Channel' && start>=0 && count>0){
                profiles=list(index?.profiles).filter(p=>start<=p.end && start+count-1>=p.start).map(p=>p.id);
                mapping='range';
            }
            return {...m,...meta,kind,channels:Number(m.ChannelCountPerNode || meta.channels || 3),
                label:meta.DisplayName || m.DisplayName || m.Name, parent:meta.Parent || m.Parent || '',
                profiles,mapping,disabled:m.Name.includes(',')};
        });
        const byName=new Map(result.map(m=>[m.Name,m]));
        for(const m of result)if(!m.profiles.length && m.parent && byName.has(m.parent)){
            m.profiles=byName.get(m.parent).profiles;m.mapping='parent';
        }
        return result.sort((a,b)=>a.Name.localeCompare(b.Name,undefined,{numeric:true}));
    }
    function groupCommands(models, build) {
        const buckets=new Map();
        for(const m of models) {
            const command=build(m), key=JSON.stringify([command.command,command.args.slice(1)]);
            if(!buckets.has(key)) buckets.set(key,{command,models:[]});
            buckets.get(key).models.push(m.Name);
        }
        return [...buckets.values()].map(({command,models})=>({...command,args:[modelTargets(models),...command.args.slice(1)]}));
    }
    function freshConfig(data={}) {
        return {version:1,models:list(data.models).filter(x=>typeof x==='string'),effect:typeof data.effect==='string'?data.effect:SOLID,
            effectValues:data.effectValues && typeof data.effectValues==='object'?data.effectValues:{},
            solidColor:colorValid(data.solidColor || '')?data.solidColor:'#FF6600',solidBrightness:clamp(data.solidBrightness ?? 128,0,255),
            visibility:['Enabled','Transparent','Transparent RGB'].includes(data.visibility)?data.visibility:'Enabled',
            favorites:list(data.favorites).filter(x=>typeof x==='string'),presets:list(data.presets).filter(x=>x && typeof x.name==='string' && typeof x.effect==='string'),
            // Never arm live output by loading saved configuration.
            live:data.live===true,multisync:false,hosts:list(data.hosts).filter(x=>typeof x==='string')};
    }
    // One in-flight request. Pending live edits are replaceable; Stop cancels them.
    class CommandQueue {
        constructor(){this.pending=[];this.active=false;}
        enqueue(run,key='manual') {
            return new Promise((resolve,reject)=>{
                if(key==='live') this.cancel('live');
                this.pending.push({run,key,resolve,reject});this.drain();
            });
        }
        cancel(key){this.pending=this.pending.filter(j=>{if(j.key===key){j.resolve(false);return false;}return true;});}
        async drain(){if(this.active)return;this.active=true;while(this.pending.length){const j=this.pending.shift();try{j.resolve(await j.run());}catch(e){j.reject(e);}}this.active=false;}
    }
    return {SOLID,clamp,list,unique,colorValid,colorParts,colorHex,hsvToHex,hexToHsv,targetColor,safeApiPath,
        normalizeSchema,defaults,visibleArgs,validation,effectCommand,fillCommand,stopCommand,normalizeModels,groupCommands,freshConfig,CommandQueue};
});
