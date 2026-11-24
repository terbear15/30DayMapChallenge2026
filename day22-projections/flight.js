import {nonstop} from './nonstop.js';
import * as T from '../day17-light-dark/vendor/three.module.js';
import {sunVector,altitude} from '../day17-light-dark/solar.js';
const $=id=>document.getElementById(id),rad=Math.PI/180;
const vec=(lon,lat)=>new T.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon));
import {rankedAirports} from './airport-catalog.js';
import {airports as legacy,schedules} from './routes.js';
const airports={...rankedAirports,SYD:legacy.SYD};
const fields=[$('from'),$('to')], list=$('suggestions');
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const entries=Object.entries(airports);
function matches(query){
 const q=normalize(query);
 return entries.filter(([code,[city,,,,name]])=>normalize([code,city,name].join(' ')).includes(q))
   .sort(([a],[b])=>Number(b.toLowerCase()===q)-Number(a.toLowerCase()===q));
}
let choices=[],active=-1,editing;
function closeList(){list.hidden=true;fields.forEach(f=>{f.setAttribute('aria-expanded','false');f.removeAttribute('aria-activedescendant');});}
function choose(i){editing.value=choices[i][0];editing.setCustomValidity('');closeList();}
function suggest(field){
 editing=field;choices=matches(field.value).filter(([code])=>field!==fields[1] || !airports[fields[0].value] || nonstop[fields[0].value]?.includes(code)).slice(0,6);active=-1;list.replaceChildren();
 for(const [i,[code,[city,,,,name]]] of choices.entries()){
   const row=document.createElement('div');row.id='airport-option-'+i;row.setAttribute('role','option');
   row.textContent=code+' · '+city+' — '+(name||'Sydney Airport');
   row.onpointerdown=e=>e.preventDefault();row.onclick=()=>choose(i);list.append(row);
 }
 list.hidden=!choices.length;field.setAttribute('aria-expanded',String(!list.hidden));field.removeAttribute('aria-activedescendant');
}
for(const field of fields){
 field.onfocus=()=>{field.select();suggest(field);};field.onblur=closeList;
 field.oninput=()=>{field.setCustomValidity('');suggest(field);};
 field.onkeydown=e=>{
   if(e.key==='Escape'){closeList();return;}
   if(list.hidden)return;
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
     e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;
     Array.from(list.children).forEach((r,i)=>r.setAttribute('aria-selected',String(i===active)));
     field.setAttribute('aria-activedescendant',list.children[active].id);
   }
   if(e.key==='Enter' && (active>=0 || choices.length===1 || !fields[1].value && field===fields[0])){
     e.preventDefault();choose(Math.max(0,active));if(field===fields[0])fields[1].focus();else $('picker').requestSubmit();
   }
 };
}
let renderer,session,leaveGlobe;
function surface(){return renderer??=new T.WebGLRenderer({canvas:$('surface'),antialias:true});}
const textures=new Map();
function loadTexture(url){if(!textures.has(url))textures.set(url,new T.TextureLoader().loadAsync(url).catch(e=>{textures.delete(url);throw e;}));return textures.get(url);}
$('picker').onsubmit=e=>{
 e.preventDefault();const codes=[];
 for(const f of fields){
   const code=f.value.trim().toUpperCase(), options=matches(f.value);
   const selected=Object.hasOwn(airports,code)?code:options.length===1?options[0][0]:null;
   if(!selected||codes.includes(selected)){f.setCustomValidity(selected?'Choose different airports.':'Select an airport from the suggestions.');f.reportValidity();suggest(f);return;}
   f.value=selected;codes.push(selected);
 }
 if(!nonstop[codes[0]]?.includes(codes[1])){fields[1].setCustomValidity('No confirmed nonstop service in this directory. Choose a listed destination.');fields[1].reportValidity();return;}
 closeList();const url=new URL(location.href);url.searchParams.set('flight',codes.join('-'));history.replaceState(null,'',url);
 if(leaveGlobe)leaveGlobe();else openFlight();
};
function openFlight(){
 session?.abort();session=new AbortController();const {signal}=session;
const requested=new URLSearchParams(location.search).get('flight');
const flight=nonstop[requested?.split('-')[0]]?.includes(requested?.split('-')[1]) && requested?.split('-').length===2 && requested.split('-').every(c=>Object.hasOwn(airports,c)) && requested.slice(0,3)!==requested.slice(4)?requested:'JFK-HND';
const waiting=requested!==flight;
document.body.classList.toggle('awaiting-route',waiting);
const [origin,destination]=flight.split('-'),pair=[airports[origin],airports[destination]];
const [A,B]=pair.map(a=>vec(a[1]*rad,a[2]*rad));
document.documentElement.classList.toggle('intro-earth',waiting);
if(!waiting){$('from').value=origin;$('to').value=destination;}
$('source').hidden=false;
$('source').href='https://www.flightsfrom.com/'+flight;
$('route').setAttribute('aria-label','Great-circle route from '+origin+' to '+destination);
$('departure-title').textContent=origin+' · DEPARTURE';$('arrival-title').textContent=destination+' · ARRIVAL';
const angle=A.angleTo(B),dist=angle*6371.0088;
function position(t){return A.clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(B,Math.sin(t*angle)).normalize();}
const center=position(.5),east=new T.Vector3(-center.z,0,center.x).normalize(),north=east.clone().cross(center).normalize();
let yaw=0,pitch=0,orientationDirty=false;
let look=center.clone(),right=east.clone(),up=north.clone();
function orient(){
 const axis=center.clone().applyAxisAngle(east,pitch).applyAxisAngle(new T.Vector3(0,1,0),yaw);
 look.copy(axis);right.set(-look.z,0,look.x).normalize();up.copy(right).cross(look).normalize();
 orientationDirty=dirty=true;
}
function home(){if(yaw||pitch){yaw=pitch=0;orient();}}
const coords=v=>[Math.atan2(v.z,v.x),Math.asin(v.y)];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const meridian=Math.atan2(center.z,center.x);
const wrap=l=>Math.atan2(Math.sin(l),Math.cos(l));
const route=Array.from({length:193},(_,i)=>position(i/192));
const zones=pair.map(a=>a[3]);
const local=zones.map(timeZone=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
function readLocal(value,i){
 const naive=Date.parse(value+'Z'),matches=[];
 for(let off=-12;off<=14;off+=.5){const t=naive-off*3600000;if(!Number.isFinite(t))continue;
 const p=Object.fromEntries(local[i].formatToParts(t).map(p=>[p.type,p.value]));
 if(p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute===value)matches.push(t);}
 if(matches.length!==1)throw Error('Choose an unambiguous local time outside the daylight-saving clock change.');
 return matches[0];
}
const fmt=zones.map(timeZone=>new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}));
let departure,arrival,t=0,playing=false,last=0,lastText='',dirty=true;
const phase=(date,v)=>{const [l,p]=coords(v),a=altitude(date,p/rad,l/rad);return a>=0?'Daylight':a>=-6?'Twilight':'Night';};
let automatic=true, blend=0, transition=null;
const dial=$('projection'),buttons=[...$('modes').children];
function selectProjection(target){
 automatic=target===null;
 if(target!==0)home();
 transition={from:blend,to:target,start:performance.now()};
 buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(automatic?i===3:i===target)));
}
function itinerary(){try{
 const start=readLocal($('a').value,0),end=readLocal($('b').value,1);
 if(end<=start)throw Error('Arrival must follow departure in absolute time.');
 departure=start;arrival=end;t=0;playing=false;selectProjection(null);lastText='';$('error').textContent='';
 const offset=(Date.parse($('b').value.slice(0,10))-Date.parse($('a').value.slice(0,10)))/86400000;
 $('dep').textContent=fmt[0].format(start);$('arr').textContent=fmt[1].format(end)+(offset?' ('+(offset>0?'+':'')+offset+'d)':'');
 }catch(e){$('error').textContent=e.message;}}
const endParts=Object.fromEntries(local[1].formatToParts(readLocal($('a').value,0)+(schedules[flight] ?? Math.round(dist/850*60+30))*60000).map(p=>[p.type,p.value]));
$('b').value=endParts.year+'-'+endParts.month+'-'+endParts.day+'T'+endParts.hour+':'+endParts.minute;
document.querySelector('details form').onsubmit=e=>{e.preventDefault();itinerary();};itinerary();
function toggle(){
 if(t>=1){t=0;blend=0;selectProjection(null);}
 playing=!playing;
}
$('play').onclick=toggle;document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target.isContentEditable || event.target.closest('input, select, textarea, button, a[href], dialog')) return;
  event.preventDefault();
  if (!event.repeat) toggle();
}, {signal});
let gesture=null;
$('route').onpointerdown=e=>{if(!e.isPrimary)return;gesture={x:e.clientX,y:e.clientY,a:yaw,b:pitch,drag:false};e.target.setPointerCapture(e.pointerId);};
$('route').onpointermove=e=>{if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)>5)gesture.drag=true;
 if(gesture.drag && +$('projection').value===0){automatic=false;transition=null;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===0)));yaw=gesture.a+dx*.005;pitch=Math.max(-1.25,Math.min(1.25,gesture.b+dy*.004));orient();}};
$('route').onpointerup=()=>{if(gesture&&!gesture.drag)toggle();gesture=null;};
$('route').onpointercancel=()=>gesture=null;
$('progress').oninput=e=>{playing=false;t=+e.target.value;};
$('projection').oninput=()=>{automatic=false;transition=null;blend=+dial.value;home();buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===blend)));};
buttons.forEach((b,i)=>b.onclick=()=>selectProjection(i===3?null:i));
function raw(v,longitude,latitude){
 const z=v.dot(center),x=v.dot(east),y=v.dot(north);
 return [[v.dot(right),v.dot(up)],[x/Math.max(.18,z),y/Math.max(.18,z)],[wrap(longitude-meridian),Math.asinh(Math.tan(Math.max(-85*rad,Math.min(85*rad,latitude))))]];
}
let samples=route.map(v=>raw(v,...coords(v)));
let frames=[],w,h,m;
function project(all){const i=Math.min(1,Math.floor(m)),k=m-i;
 return [0,1].map(d=>(all[i][d]*frames[i].scale+frames[i].shift[d])*(1-k)+(all[i+1][d]*frames[i+1].scale+frames[i+1].shift[d])*k);}
async function idleGlobe(){
 const canvas=$('surface'), renderer=surface();
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const texture=await loadTexture('../day17-light-dark/assets/day-preview.jpg');
 if(signal.aborted)return;
 texture.colorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,20);
 const globe=new T.Mesh(new T.SphereGeometry(1,72,48),new T.MeshLambertMaterial({map:texture}));
 let cloudLayer, fadeStart=null, startY, startZ, targetY, targetX;
 const limit=renderer.capabilities.maxTextureSize;
 const detail=limit>=16384?'day-globe-hd':limit>=8192?'day-globe':'day-globe-medium';
 loadTexture('../day17-light-dark/assets/'+detail+'.jpg').then(tex=>{if(signal.aborted)return;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();globe.material.map=tex;globe.material.needsUpdate=true;draw();}).catch(()=>{});
 loadTexture('../day17-light-dark/assets/atmosphere.webp').then(mask=>{
   if(signal.aborted)return;
   const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{mask:{value:mask},opacity:{value:1}},
     vertexShader:'varying vec2 u; varying vec3 n; void main(){u=uv;n=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
     fragmentShader:'varying vec2 u;varying vec3 n;uniform sampler2D mask;uniform float opacity;      void main(){        float density=texture2D(mask,u).r;        float sun=dot(normalize(n),normalize(vec3(-3.,2.,4.)));        float relief=density-texture2D(mask,u+vec2(-.001,.001)).r;        vec3 color=mix(vec3(.44,.52,.63),vec3(1.,.97,.91),smoothstep(-.2,.78,sun));        gl_FragColor=vec4(color*(1.+.23*relief),opacity*.62*smoothstep(.055,.91,density));      }'});
   const clouds=new T.Mesh(globe.geometry,material);clouds.scale.setScalar(1.004);globe.add(clouds);cloudLayer=clouds;draw();
   signal.addEventListener('abort',()=>material.dispose(),{once:true});
 }).catch(()=>{});
 scene.add(globe,new T.AmbientLight(0xffffff,.65));
 const sun=new T.DirectionalLight(0xfff5de,2);sun.position.set(-3,2,4);scene.add(sun);
 renderer.setClearColor(0x05090d);globe.rotation.z=.12;
 function draw(){renderer.render(scene,camera);}
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.position.z=4.3/Math.min(1,camera.aspect);camera.updateProjectionMatrix();draw();}
 resize();$('earth-preview').hidden=true;const observer=new ResizeObserver(resize);observer.observe(canvas);signal.addEventListener('abort',()=>{observer.disconnect();globe.geometry.dispose();globe.material.dispose();},{once:true});$('status').hidden=true;
 let previous=performance.now();
 function turn(now){if(signal.aborted)return;globe.rotation.y+=Math.min(now-previous,100)*.00009;previous=now;
 if(cloudLayer)cloudLayer.rotation.y=globe.rotation.y*.035;
 if(fadeStart!==null){
   const progress=Math.min(1,(now-fadeStart)/2600);
   const ease=progress*progress*(3-2*progress);
   globe.rotation.order='XYZ';globe.rotation.y=startY+targetY*ease;globe.rotation.x=targetX*ease;globe.rotation.z=.12*(1-ease);
   camera.position.z=startZ*(1-.23*ease);
   if(cloudLayer)cloudLayer.material.uniforms.opacity.value=1-progress*progress*(3-2*progress);
   if(progress===1){draw();const overlay=document.createElement('canvas');overlay.width=canvas.width;overlay.height=canvas.height;overlay.getContext('2d').drawImage(canvas,0,0);overlay.id='camera-overlay';overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:1';canvas.parentElement.append(overlay);leaveGlobe=null;openFlight();return;}
 }
 draw();requestAnimationFrame(turn);}
 leaveGlobe=()=>{
   if(reduceMotion){leaveGlobe=null;openFlight();return;}
   const midpoint=fields.map(f=>airports[f.value]).map(a=>vec(a[1]*rad,a[2]*rad)).reduce((a,b)=>a.add(b)).normalize();
   startY=globe.rotation.y; startZ=camera.position.z;
   const heading=-Math.PI/2-Math.atan2(midpoint.z,midpoint.x);
   targetY=Math.atan2(Math.sin(heading-startY),Math.cos(heading-startY));
   targetX=Math.asin(midpoint.y);fadeStart=performance.now();
 };
 if(!reduceMotion)requestAnimationFrame(turn);
}
async function run(){
 const renderer=surface();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 const loader=new T.TextureLoader(),[day,night]=await Promise.all(['day-preview','night-preview'].map(n=>loadTexture('../day17-light-dark/assets/'+n+'.jpg')));
 if(signal.aborted)return;
 for(const tex of [day,night]){tex.wrapS=T.RepeatWrapping;tex.needsUpdate=true;}
 const max=renderer.capabilities.maxTextureSize;
 const large=matchMedia('(pointer:fine)').matches && (navigator.deviceMemory||8)>=8;
 async function refine(){
   
   const files=[['day','day-globe-medium'],['night','night-globe']];
   if(large && max>=8192)files.push(['night','flight-night-hd'],['day','day-globe']);
   for(const [key,name] of files){
     const tex=await loadTexture('../day17-light-dark/assets/'+name+'.jpg');
     if(signal.aborted)return;
     tex.wrapS=T.RepeatWrapping;tex.generateMipmaps=false;tex.minFilter=T.LinearFilter;
     uniforms[key].value=tex;textureVersion++;
   }
 }
 const geom=new T.PlaneGeometry(1,1,160,80),uv=geom.attributes.uv,xyz=geom.attributes.position;
 const vectors=[],vertices=[],depth=new Float32Array(uv.count);
 for(let i=0;i<uv.count;i++){const offset=(uv.getX(i)-.5)*2*Math.PI,l=offset+meridian,p=(uv.getY(i)-.5)*Math.PI,v=vec(l,p);
 const maps=raw(v,l,p);maps[2][0]=offset;vectors.push(v);vertices.push(maps);depth[i]=v.dot(center);}
 geom.setAttribute('front',new T.BufferAttribute(depth,1));
 const flatA=new T.BufferAttribute(new Float32Array(uv.count*2),2),flatB=flatA.clone();geom.setAttribute('flatA',flatA);geom.setAttribute('flatB',flatB);
 const uniforms={central:{value:meridian},blend:{value:0},day:{value:day},night:{value:night},sun:{value:new T.Vector3()},clip:{value:0}};
 const material=new T.ShaderMaterial({side:T.DoubleSide,uniforms,vertexShader:'attribute vec2 flatA,flatB;uniform float blend;attribute float front; varying float f; varying vec2 u; void main(){u=uv;f=front;vec2 p=mix(position.xy,flatA,min(blend,1.));p=mix(p,flatB,max(0.,blend-1.));gl_Position=vec4(p,position.z,1.);}',fragmentShader:`varying float f;varying vec2 u;uniform float central;uniform float clip;uniform vec3 sun;uniform sampler2D day,night;void main(){if(f<clip)discard;float l=(u.x-.5)*6.2831853+central,p=(u.y-.5)*3.14159265;vec3 n=vec3(cos(p)*cos(l),sin(p),cos(p)*sin(l));float light=dot(n,sun);vec2 tex=vec2(u.x+central/6.2831853,u.y);gl_FragColor=vec4(mix(texture2D(night,tex).rgb,texture2D(day,tex).rgb*(.70+.33*sqrt(max(light,0.))),smoothstep(-.14,.12,light)),1.);}`});
 const scene=new T.Scene(),mesh=new T.Mesh(geom,material);mesh.frustumCulled=false;scene.add(mesh);const camera=new T.Camera();
 renderer.setClearColor(0x05090d);const canvas=$('route'),ctx=canvas.getContext('2d');$('status').hidden=true;
 const labelFont='600 12px '+getComputedStyle(document.body).fontFamily;
 let lastMapTime, textureVersion=0, lastTexture=-1; let points,lastBlend=-1;const observer=new ResizeObserver(()=>{if(!playing)dirty=true;});observer.observe(document.querySelector('.deck'));signal.addEventListener('abort',()=>{observer.disconnect();geom.dispose();material.dispose();},{once:true});
 function render(now){
 if(signal.aborted)return;
 if(playing){t=Math.min(1,t+(now-last)*3600*Number($('speed').value)/(arrival-departure));if(t===1)playing=false;}last=now;
 if(w!==canvas.clientWidth||h!==canvas.clientHeight||dirty){
 lastBlend=-1;dirty=false;w=canvas.clientWidth;h=canvas.clientHeight;m=+$('projection').value;
 const ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio)){renderer.setSize(w,h,false);canvas.width=w*ratio;canvas.height=h*ratio;}ctx.setTransform(ratio,0,0,ratio,0,0);
 if(orientationDirty){orientationDirty=false;
 for(let j=0;j<vectors.length;j++){const v=vectors[j];vertices[j][0]=[v.dot(right),v.dot(up)];depth[j]=v.dot(look);}
 geom.attributes.front.needsUpdate=true;samples=route.map(v=>raw(v,...coords(v)));}
 frames=[0,1,2].map(i=>{const xx=samples.map(s=>s[i][0]),yy=samples.map(s=>s[i][1]);
 const x0=Math.min(...xx),x1=Math.max(...xx),y0=Math.min(...yy),y1=Math.max(...yy);
 const safeTop=document.querySelector('header').getBoundingClientRect().bottom+20;
 const safeBottom=document.querySelector('.deck').getBoundingClientRect().top-28;
 const available=Math.max(65,safeBottom-safeTop),mid=(safeBottom+safeTop)/2;
 if(i===0){const radius=Math.min(w*.47,available*.55);return {scale:radius,shift:[w/2,h-mid]};}
 const scale=Math.min((w-Math.min(90,w*.16))/Math.max(.1,x1-x0),available/Math.max(.32,y1-y0),i===0?Math.max(w,h)*.85:Infinity);
 return {scale,shift:[w/2-scale*(x0+x1)/2,h-mid-scale*(y0+y1)/2]};});
 for(let i=0;i<vertices.length;i++){
   const ndc=vertices[i].map(([x,y],j)=>[(x*frames[j].scale+frames[j].shift[0])/w*2-1,(y*frames[j].scale+frames[j].shift[1])/h*2-1]);
   xyz.setXYZ(i,...ndc[0],-depth[i]*.5);flatA.setXY(i,...ndc[1]);flatB.setXY(i,...ndc[2]);
 }
 xyz.needsUpdate=flatA.needsUpdate=flatB.needsUpdate=true;
 }
 const flightBlend=2*t*t*(3-2*t);
 if(transition){
   const u=reduceMotion?1:Math.min(1,Math.max(0,(now-transition.start)/650));
   const smooth=u*u*(3-2*u);
   blend=transition.from+((transition.to??flightBlend)-transition.from)*smooth;
   if(u===1)transition=null;
 }else if(automatic){blend=flightBlend;}
 m=blend;dial.value=m;uniforms.blend.value=m;uniforms.clip.value=m<=1?.18*m:.18-1.19*(m-1);
 const mapChanged=lastBlend!==m || lastMapTime!==departure+t*(arrival-departure) || lastTexture!==textureVersion;
 if(lastBlend!==m){points=samples.map(project);lastBlend=m;}
 const time=new Date(departure+t*(arrival-departure)),v=position(t);
 uniforms.sun.value.fromArray(sunVector(time));if(mapChanged){renderer.render(scene,camera);$('earth-preview').hidden=true;const overlay=$('camera-overlay');if(overlay&&!overlay.dataset.fading){overlay.dataset.fading='1';overlay.animate([{opacity:1},{opacity:0}],{duration:750,fill:'forwards'}).onfinish=()=>overlay.remove();}lastMapTime=departure+t*(arrival-departure);lastTexture=textureVersion;}
 ctx.clearRect(0,0,w,h);ctx.beginPath();let pen=false;points.forEach(([x,y],i)=>{if(m===0&&route[i].dot(look)<0){pen=false;return;}if(pen)ctx.lineTo(x,h-y);else ctx.moveTo(x,h-y);pen=true;}); ctx.save();ctx.globalAlpha=.75;ctx.strokeStyle='#edaa49';ctx.shadowColor='#ffad4b';ctx.shadowBlur=12;ctx.lineWidth=2.8;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#ffe5a8';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 // Each pulse follows equal-distance samples from departure to arrival.
 if(!reduceMotion){
   function onLine(f){
     const n=f*(points.length-1),i=Math.min(points.length-2,Math.floor(n)),k=n-i;
     return [0,1].map(d=>points[i][d]+k*(points[i+1][d]-points[i][d]));
   }
   const shift=(now%2600)/2600;
   ctx.save();ctx.globalAlpha=.75;ctx.lineCap='round';ctx.shadowColor='#ffc567';ctx.shadowBlur=9;
   // Batch the four pulse trails by intensity, sharing each canvas stroke.
   ctx.shadowBlur=0;
   for(let j=1;j<=5;j++){
     ctx.beginPath();
     for(let head=shift/4;head<1.06;head+=.25){
       const f=head-(5-j)*.008;
       if(f<.008||f>1||(m===0&&route[Math.round(f*192)].dot(look)<0))continue;
       const q=onLine(f),r=onLine(f-.008);ctx.moveTo(r[0],h-r[1]);ctx.lineTo(q[0],h-q[1]);
     }
     ctx.strokeStyle='rgba(255,245,199,'+(j/5)+')';ctx.lineWidth=1+j*.4;ctx.stroke();
   }
ctx.restore();
 }
 for(const [idx,name] of [[0,origin],[192,destination]]){if(m===0&&route[idx].dot(look)<0)continue;
 const [x,y]=points[idx],dir=x<w/2?-1:1,tx=Math.max(28,Math.min(w-28,x+dir*24)),ty=h-y+15;
 ctx.save();ctx.strokeStyle='#f6e7c7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,h-y);ctx.lineTo(tx,ty);ctx.stroke();
 ctx.fillStyle='rgba(8,15,22,.90)';ctx.beginPath();ctx.roundRect(tx-22,ty-9,44,19,5);ctx.fill();
 ctx.fillStyle='#fff6df';ctx.font=labelFont;ctx.textAlign='center';ctx.fillText(name,tx,ty+4);ctx.restore();}
 const [x,y]=project(raw(v,...coords(v))),v2=position(t>.999?t-.001:t+.001),[xx,yy]=project(raw(v2,...coords(v2)));
 ctx.save();ctx.translate(x,h-y);ctx.rotate(Math.atan2(y-yy,xx-x)+(t>.999?Math.PI:0));if(m!==0||v.dot(look)>=0){ctx.fillStyle='#fff';ctx.strokeStyle='#26303a';ctx.lineWidth=1.4;ctx.lineJoin='round';const plane=new Path2D('M12 0 Q11 -2 4 -2 L-3 -10 L-5 -10 L-2 -2 L-8 -1 L-11 -4 L-12 -4 L-10 0 L-12 4 L-11 4 L-8 1 L-2 2 L-5 10 L-3 10 L4 2 Q11 2 12 0 Z');ctx.stroke(plane);ctx.fill(plane);}ctx.restore();
 const key=[Math.floor(+time/60000),playing,t===1].join('/');
 if(key!==lastText){lastText=key;
 const duration=ms=>{const min=Math.round(ms/60000);return Math.floor(min/60)+'h '+min%60+'m';};
 $('elapsed').textContent=duration(t*(arrival-departure))+' elapsed';$('distance').textContent=duration((1-t)*(arrival-departure))+' left · '+Math.round(dist*t).toLocaleString()+' km flown';
 $('ny').textContent='Now · '+fmt[0].format(time);$('jp').textContent='Now · '+fmt[1].format(time)+' · '+phase(new Date(arrival),B)+' on arrival';
 $('phase').textContent=phase(time,v);$('play').textContent=playing?'Pause':t===1?'Replay flight':'Preview flight';}
 $('pct').textContent=Math.round(t*100)+'%';$('progress').value=t;requestAnimationFrame(render);}
 requestAnimationFrame(render);refine().catch(()=>{});
}
(waiting?idleGlobe():run()).catch(e=>{$('status').textContent='Map unavailable. Reload to retry. '+e.message;});

}
openFlight();
