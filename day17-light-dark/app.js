import {regions, HOUR, sunVector, altitude, dateKey, addDays, zonedTime, clockParts} from './solar.js';
import {earthView} from './earth.js?v=relief2';
const el=id=>document.getElementById(id);
const canvas=el('map');
let instant=zonedTime(dateKey(new Date()),12), playing=false, speed=1, zoom=1, lon=-96,lat=38, selection=null;
let render, introStart, intro=true, previous=0,lastDraw=-1000;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function reset(){zoom=1;lon=-96;lat=38;}
function start(){intro=false;document.body.classList.remove('intro-running');playing=!reduced;previous=performance.now();}
let cachedDay,midnight,nextMidnight;
function update(){
 const d=new Date(instant),key=dateKey(d);
 if(key!==cachedDay){cachedDay=key;midnight=zonedTime(key);nextMidnight=zonedTime(addDays(key,1));}
 const a=midnight,b=nextMidnight;
 el('timeline').value=(instant-a)/(b-a);el('date-label').textContent=key;
 regions.forEach((r,i)=>{const c=clockParts(d,r.zone);el('r'+i).textContent=c.time;if(!i){el('main-time').textContent=c.time;el('main-zone').textContent=c.abbreviation;}});
 el('play').textContent=playing?'Ⅱ':'▶';el('play').setAttribute('aria-label',playing?'Pause simulation':'Play simulation');
 if(selection){const r=selection, times=SunCalc.getTimes(new Date(zonedTime(dateKey(d,r.zone),12,r.zone)),r.lat,r.lon);
 el('region-detail').textContent=r.name+' · Solar altitude '+altitude(d,r.lat,r.lon).toFixed(1)+'° · Sunrise '+clockParts(times.sunrise,r.zone).time+' · Sunset '+clockParts(times.sunset,r.zone).time;}
}
function frame(now){
 if(!intro && playing)instant+=(now-previous)*speed*HOUR/1500;previous=now;
 const progress=intro?Math.max(0,Math.min(1,(now-introStart)/7500)):1;
 render(progress,lon,lat,zoom,sunVector(new Date(instant)));
 if(intro && progress===1)start();
 if(!intro && now-lastDraw>120){update();lastDraw=now;}
requestAnimationFrame(frame);
}
regions.forEach((r,i)=>{const b=document.createElement('button');b.className='region-clock';b.innerHTML='<span class="region-name">'+r.name+'</span><strong style="display:block" id="r'+i+'"></strong>';b.onclick=()=>{selection=selection===r?null:r;el('region-detail').hidden=!selection;};el('region-clocks').append(b);});
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
canvas.onwheel=e=>{e.preventDefault();if(!intro)scale(Math.exp(-e.deltaY*.001));};
canvas.onpointerdown=e=>!intro && canvas.setPointerCapture(e.pointerId);
canvas.onpointermove=e=>{if(canvas.hasPointerCapture(e.pointerId)){const k=Math.min(canvas.width/72,canvas.height/52)*zoom;lon=((lon-e.movementX/k+540)%360)-180;lat=Math.max(-80,Math.min(80,lat+e.movementY/k));}};
el('zone-toggle').disabled=true;el('zone-toggle').title='Boundary overlay pending';
el('retry').onclick=()=>location.reload();
try{
 render=await earthView(canvas);el('loading').hidden=true;document.body.classList.add('intro-running');introStart=performance.now();if(reduced)start();requestAnimationFrame(frame);
}catch(err){el('loading').hidden=true;el('error').hidden=false;el('error-message').textContent=err.message;}
