import {regions as americanZones, HOUR, sunVector, altitude, dateKey, addDays, zonedTime, clockParts} from './solar.js';
import {earthView} from './earth.js?v=night2';
const el=id=>document.getElementById(id);
const canvas=el('map');
let instant=zonedTime(dateKey(new Date()),12), playing=false, speed=1, zoom=1, lon=-96,lat=38, selection=null;
let render, introStart, intro=true, previous=0,lastDraw=-1000;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const zone=(name,zone,lat,lon)=>({name,zone,lat,lon});
const views=[
 {name:'North America',lon:-96,lat:38,zoom:1,clocks:americanZones},
 {name:'Europe',lon:19,lat:46,zoom:.98,clocks:[
  zone('Western European','Europe/Lisbon',38.72,-9.14),zone('Central European','Europe/Berlin',52.52,13.40),
  zone('Eastern European','Europe/Helsinki',60.17,24.94),zone('Moscow Time','Europe/Moscow',55.75,37.62),
  zone('Türkiye Time','Europe/Istanbul',41.01,28.98)]},
 {name:'East Asia',lon:127,lat:38,zoom:.86,clocks:[
  zone('China Standard Time','Asia/Shanghai',39.90,116.41),zone('Japan Standard Time','Asia/Tokyo',35.68,139.69),
  zone('Korea Standard Time','Asia/Seoul',37.57,126.98)]}
];
let viewIndex=0,regions=views[0].clocks;
function reset(){const view=views[viewIndex];zoom=view.zoom;lon=view.lon;lat=view.lat;}
function switchView(direction){
 if(intro)return;
 viewIndex=(viewIndex+direction+views.length)%views.length;
 const view=views[viewIndex];regions=view.clocks;reset();selection=null;
 el('region-detail').hidden=true;el('view-name').textContent=view.name;
 el('previous-view').setAttribute('aria-label','View '+views[(viewIndex+2)%3].name);
 el('next-view').setAttribute('aria-label','View '+views[(viewIndex+1)%3].name);
 buildClocks();update();
}
function start(){el('skip-camera').hidden=true;intro=false;document.body.classList.remove('intro-running');playing=!reduced;previous=performance.now();}
let cachedDay,midnight,nextMidnight;
function update(){
 const d=new Date(instant),key=dateKey(d);
 if(key!==cachedDay){cachedDay=key;midnight=zonedTime(key);nextMidnight=zonedTime(addDays(key,1));}
 const a=midnight,b=nextMidnight;
 el('timeline').value=(instant-a)/(b-a);el('date-label').textContent=key;
 regions.forEach((r,i)=>{const c=clockParts(d,r.zone);el('r'+i).textContent=c.time;const localDay=dateKey(d,r.zone);el('r'+i).dataset.day=localDay>key?'+1':localDay<key?'−1':'';el('r'+i).title=localDay+' · '+c.abbreviation;});
 const reference=clockParts(d,americanZones[0].zone);el('main-time').textContent=reference.time;el('main-zone').textContent=reference.abbreviation;
 el('play').textContent=playing?'Ⅱ':'▶';el('play').setAttribute('aria-label',playing?'Pause simulation':'Play simulation');
 if(selection){const r=selection, times=SunCalc.getTimes(new Date(zonedTime(dateKey(d,r.zone),12,r.zone)),r.lat,r.lon);
 el('region-detail').textContent=r.name+' · Solar altitude '+altitude(d,r.lat,r.lon).toFixed(1)+'° · Sunrise '+clockParts(times.sunrise,r.zone).time+' · Sunset '+clockParts(times.sunset,r.zone).time;}
}
function frame(now){
 if(!intro && playing)instant+=(now-previous)*speed*HOUR/500;previous=now;
 const progress=intro?Math.max(0,Math.min(1,(now-introStart)/5000)):1;
 render(progress,lon,lat,zoom,sunVector(new Date(instant)),views[viewIndex].name);
 if(intro && progress===1)start();
 if(!intro && now-lastDraw>120){update();lastDraw=now;}
requestAnimationFrame(frame);
}
function buildClocks(){const wrap=el('region-clocks');wrap.replaceChildren();wrap.style.gridTemplateColumns='repeat('+regions.length+', minmax(0,1fr))';regions.forEach((r,i)=>{const b=document.createElement('button');b.className='region-clock';b.innerHTML='<span class="region-name">'+r.name+'</span><strong style="display:block" id="r'+i+'"></strong>';b.onclick=()=>{selection=selection===r?null:r;el('region-detail').hidden=!selection;};el('region-clocks').append(b);});
}
buildClocks();
el('previous-view').onclick=()=>switchView(-1);el('next-view').onclick=()=>switchView(1);
el('play').onclick=()=>playing=!playing;el('restart').onclick=()=>instant=zonedTime(dateKey(new Date(instant)),12);
el('speed').onchange=e=>speed=+e.target.value;
el('timeline').oninput=e=>{playing=false;const key=dateKey(new Date(instant)),a=zonedTime(key);instant=a+Math.min(.999999,+e.target.value)*(zonedTime(addDays(key,1))-a);};
const months=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'});
for(let y=2000;y<=2100;y++)el('year').add(new Option(String(y),String(y)));
for(let m=1;m<=12;m++)el('month').add(new Option(months.format(Date.UTC(2026,m-1,15)),String(m)));
function dates(selected){
 const days=new Date(Date.UTC(+el('year').value,+el('month').value,0)).getUTCDate();
 el('date').replaceChildren();
 for(let i=1;i<=days;i++)el('date').add(new Option(String(i),String(i)));
 el('date').value=String(Math.min(selected,days));
}
el('year').onchange=el('month').onchange=()=>dates(+el('date').value);
el('date-button').onclick=()=>{
 const [y,m,d]=dateKey(new Date(instant)).split('-').map(Number);
 el('year').value=y;el('month').value=m;dates(d);
 el('date-panel').hidden=!el('date-panel').hidden;
};
function choose(key){if(key){instant=zonedTime(key,12);el('date-panel').hidden=true;}}
el('apply-date').onclick=()=>choose([el('year').value,el('month').value.padStart(2,'0'),el('date').value.padStart(2,'0')].join('-'));
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const key=dateKey(new Date());choose(b.dataset.preset==='today'?key:key.slice(0,4)+(b.dataset.preset==='summer'?'-06-21':'-12-21'));});
el('info-button').onclick=()=>el('about').showModal();el('close-about').onclick=()=>el('about').close();
function toggleUI(){const hidden=document.body.classList.toggle('ui-hidden');el('show-interface').hidden=!hidden;}
el('hide-button').onclick=el('show-interface').onclick=toggleUI;

function scale(n){zoom=Math.max(.8,Math.min(6,zoom*n));}
canvas.ondblclick=reset;
canvas.onkeydown=e=>{
 if(intro)return;
 if(e.key===' ' || e.key==='Enter'){e.preventDefault();playing=!playing;update();return;}
 const step=8/zoom;
 if(e.key==='ArrowRight')lon+=step;
 else if(e.key==='ArrowLeft')lon-=step;
 else if(e.key==='ArrowUp')lat+=step;
 else if(e.key==='ArrowDown')lat-=step;
 else return;
 e.preventDefault();lon=((lon+540)%360)-180;lat=Math.max(-89,Math.min(89,lat));
};
canvas.onwheel=e=>{e.preventDefault();if(!intro)scale(Math.exp(-e.deltaY*.001));};
let gesture=null;
canvas.onpointerdown=e=>{
 if(intro||!e.isPrimary||e.button!==0)return;
 canvas.setPointerCapture(e.pointerId);
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lon,lat,drag:false};
};
canvas.onpointermove=e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(Math.hypot(dx,dy)>5)gesture.drag=true;
 if(!gesture.drag)return;
 const k=Math.min(canvas.clientWidth/72,canvas.clientHeight/52)*zoom;
 lon=((gesture.lon-dx/k+540)%360)-180;lat=Math.max(-89,Math.min(89,gesture.lat+dy/k));
};
canvas.onpointerup=e=>{
 if(gesture?.id===e.pointerId && !gesture.drag && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=5){playing=!playing;update();}
 gesture=null;
};
canvas.onpointercancel=canvas.onlostpointercapture=()=>{gesture=null;};
el('zone-toggle').disabled=true;el('zone-toggle').title='Boundary overlay pending';
el('retry').onclick=()=>location.reload();
try{
 render=await earthView(canvas);el('loading').hidden=true;document.body.classList.add('intro-running');function enter(){el('welcome').close();introStart=performance.now();el('skip-camera').hidden=reduced;if(reduced)start();requestAnimationFrame(frame);}
 render(0,lon,lat,zoom,sunVector(new Date(instant)),views[0].name);
 el('skip-camera').onclick=start;el('explore').onclick=enter;
 el('welcome').oncancel=e=>{e.preventDefault();enter();};
 if(location.hash==='#earth'){enter();start();}else el('welcome').showModal();
}catch(err){el('loading').hidden=true;el('error').hidden=false;el('error-message').textContent=err.message;}
