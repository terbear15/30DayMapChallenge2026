import {rankedAirports} from '../flight/airport-catalog.js';
import {airports as legacy} from '../flight/routes.js';
import {nonstop} from '../flight/nonstop.js';
const airports={...rankedAirports,SYD:legacy.SYD}, codes=Object.keys(airports);
const legs=document.querySelector('#legs'),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
let journey=['PEK','JFK'];
const links=(a,b)=>nonstop[a]?.includes(b);
let image=new Image();image.onload=()=>{draw();const hd=new Image();hd.onload=()=>{image=hd;draw();};hd.src='../earth/assets/flight-night-hd.jpg';};image.src='../earth/assets/night-globe.jpg';
let fares=[],sort='minutes';
fetch('./fares.json',{cache:'no-cache'}).then(r=>r.json()).then(data=>{fares=data;update();}).catch(()=>{});
function estimates(a,b){const u=vector(a),v=vector(b);return 30+60*6371/850*Math.acos(Math.min(1,Math.max(-1,u.reduce((n,x,i)=>n+x*v[i],0))));}
function compare(){
 const a=journey[0],b=journey.at(-1),day=document.querySelector('#date').value,results=document.querySelector('#options');results.replaceChildren();
 const rows=codes.filter(c=>links(a,c)&&links(c,b)).map(via=>{
   const quote=fares.filter(f=>f.from===a&&f.to===b&&f.via===via&&f.date===day&&Date.now()-Date.parse(f.checkedAt)<32*86400000&&f.price>0&&f.minutes>0).sort((x,y)=>x[sort]-y[sort])[0];
   return {via,quote,minutes:quote?.minutes??Math.round(estimates(a,via)+estimates(via,b)+120)};
 });
 rows.sort((x,y)=>sort==='price'?((x.quote?.price??Infinity)-(y.quote?.price??Infinity)||x.minutes-y.minutes):x.minutes-y.minutes);
 for(const row of rows.slice(0,6)){const btn=document.createElement('button');btn.type='button';btn.textContent=row.via+' · '+Math.floor(row.minutes/60)+'h '+row.minutes%60+'m'+(row.quote?' · 
function control(label,items,value,change){
 const wrap=document.createElement('label'),select=document.createElement('select');
 wrap.append(label,select);legs.append(wrap);
 for(const code of items)select.add(new Option(code+' · '+airports[code][0],code));
 select.value=value;select.onchange=()=>change(select.value);
}
function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=action;legs.append(b);return b;}
function update(){
 legs.replaceChildren();
 control('From',codes.filter(c=>nonstop[c]?.length),journey[0],c=>{journey=[c,c===journey.at(-1)?nonstop[c][0]:journey.at(-1)];update();});
 for(let i=1;i<journey.length;i++){
   const last=i===journey.length-1,prev=journey[i-1],next=journey[i+1];
   const options=codes.filter(c=>(journey.length===2||links(prev,c))&&(last||links(c,next))&&(!journey.includes(c)||c===journey[i]));
   control(last?'To':'Stop '+i,options,journey[i],c=>{journey[i]=c;update();});
   if(!last&&links(prev,next))button('Remove stop '+i,()=>{journey.splice(i,1);update();});
 }
 const end=journey.at(-1),prev=journey.at(-2);
 const stops=codes.filter(c=>!journey.includes(c)&&links(prev,c)&&links(c,end));
 const add=button('+ Add stop',()=>{journey.splice(-1,0,stops[0]);update();});add.disabled=!stops.length;
 if(!stops.length)add.title='No additional connecting airport in this directory';
 compare();draw();
}
const rad=Math.PI/180;
function vector(code){const [,x,y]=airports[code],p=y*rad,l=x*rad;return [Math.cos(p)*Math.cos(l),Math.cos(p)*Math.sin(l),Math.sin(p)];}
function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight,ratio=Math.min(devicePixelRatio,2);if(!w||!h)return;
 if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#07101a';ctx.fillRect(0,0,w,h);
 let total=0,points=[],nodes=[],previous;
 for(let i=1;i<journey.length;i++){
   const a=vector(journey[i-1]),b=vector(journey[i]),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,j)=>n+x*b[j],0))));
   total+=angle*6371;
   for(let j=0;j<=96;j++){const t=j/96,v=a.map((x,k)=>x*Math.sin((1-t)*angle)+b[k]*Math.sin(t*angle));let lon=Math.atan2(v[1],v[0])/rad;
     if(previous!==undefined)lon+=360*Math.round((previous-lon)/360);previous=lon;
     const pt=[lon,Math.atan2(v[2],Math.hypot(v[0],v[1]))/rad];points.push(pt);
     if((i===1&&j===0)||j===96)nodes.push(pt);
   }
 }
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
 const top=document.querySelector('header').getBoundingClientRect().bottom+24,bottom=document.querySelector('.planner').getBoundingClientRect().top-26;
 const scale=Math.min((w-80)/Math.max(10,east-west),Math.max(70,bottom-top)/Math.max(8,north-south)),ox=w/2-(east+west)*scale/2,oy=(top+bottom)/2+(south+north)*scale/2;
 if(image.naturalWidth){const world=360*scale;let left=(ox-180*scale)%world;if(left>0)left-=world;for(;left<w;left+=world)ctx.drawImage(image,left,oy-90*scale,world,180*scale);}
 ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](ox+x*scale,oy-y*scale));ctx.strokeStyle='#ffce83';ctx.lineWidth=2;if(journey.length>2||links(...journey))ctx.stroke();
 nodes.forEach(([x,y],i)=>{x=ox+x*scale;y=oy-y*scale;ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);ctx.fillStyle='#ffe1a6';ctx.fill();ctx.font='bold 12px system-ui';ctx.strokeStyle='#09111c';ctx.lineWidth=4;ctx.strokeText(journey[i],x+6,y-6);ctx.fillText(journey[i],x+6,y-6);});
 document.querySelector('#summary').textContent=journey.join(' → ')+' · '+Math.round(total).toLocaleString('en-US')+' km · '+(journey.length===2?(links(...journey)?'Nonstop':'Select a connection'):(journey.length-2)+' stop'+(journey.length>3?'s':''));
}
const date=document.querySelector('#date');date.value=new Date(Date.now()+30*86400000).toISOString().slice(0,10);date.min=new Date().toISOString().slice(0,10);date.onchange=update;document.querySelector('#order').onchange=e=>{sort=e.target.value;compare();};
new ResizeObserver(draw).observe(document.querySelector('.planner'));window.addEventListener('resize',draw);update();
+row.quote.price:' est.');btn.onclick=()=>{journey=[a,row.via,b];update();};results.append(btn);
 if(row.quote){const link=document.createElement('a');link.href=row.quote.source;link.textContent='Quote · '+row.quote.checkedAt.slice(0,10);results.append(link);}}
 document.querySelector('#coverage').textContent=!rows.length?'No one-stop connection in this directory.':rows.some(r=>r.quote)?'Monthly one-way fare snapshots in USD. Confirm availability before booking.':'No verified fare for this date. Estimated times include a two-hour transfer.';
}
function control(label,items,value,change){
 const wrap=document.createElement('label'),select=document.createElement('select');
 wrap.append(label,select);legs.append(wrap);
 for(const code of items)select.add(new Option(code+' · '+airports[code][0],code));
 select.value=value;select.onchange=()=>change(select.value);
}
function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=action;legs.append(b);return b;}
function update(){
 legs.replaceChildren();
 control('From',codes.filter(c=>nonstop[c]?.length),journey[0],c=>{journey=[c,links(c,journey.at(-1))?journey.at(-1):nonstop[c][0]];update();});
 for(let i=1;i<journey.length;i++){
   const last=i===journey.length-1,prev=journey[i-1],next=journey[i+1];
   const options=codes.filter(c=>links(prev,c)&&(last||links(c,next))&&(!journey.includes(c)||c===journey[i]));
   control(last?'To':'Stop '+i,options,journey[i],c=>{journey[i]=c;update();});
   if(!last&&links(prev,next))button('Remove stop '+i,()=>{journey.splice(i,1);update();});
 }
 const end=journey.at(-1),prev=journey.at(-2);
 const stops=codes.filter(c=>!journey.includes(c)&&links(prev,c)&&links(c,end));
 const add=button('+ Add stop',()=>{journey.splice(-1,0,stops[0]);update();});add.disabled=!stops.length;
 if(!stops.length)add.title='No additional connecting airport in this directory';
 draw();
}
const rad=Math.PI/180;
function vector(code){const [,x,y]=airports[code],p=y*rad,l=x*rad;return [Math.cos(p)*Math.cos(l),Math.cos(p)*Math.sin(l),Math.sin(p)];}
function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight,ratio=Math.min(devicePixelRatio,2);if(!w||!h)return;
 if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#07101a';ctx.fillRect(0,0,w,h);
 let total=0,points=[],nodes=[],previous;
 for(let i=1;i<journey.length;i++){
   const a=vector(journey[i-1]),b=vector(journey[i]),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,j)=>n+x*b[j],0))));
   total+=angle*6371;
   for(let j=0;j<=96;j++){const t=j/96,v=a.map((x,k)=>x*Math.sin((1-t)*angle)+b[k]*Math.sin(t*angle));let lon=Math.atan2(v[1],v[0])/rad;
     if(previous!==undefined)lon+=360*Math.round((previous-lon)/360);previous=lon;
     const pt=[lon,Math.atan2(v[2],Math.hypot(v[0],v[1]))/rad];points.push(pt);
     if((i===1&&j===0)||j===96)nodes.push(pt);
   }
 }
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
 const top=document.querySelector('header').getBoundingClientRect().bottom+24,bottom=document.querySelector('.planner').getBoundingClientRect().top-26;
 const scale=Math.min((w-80)/Math.max(10,east-west),Math.max(70,bottom-top)/Math.max(8,north-south)),ox=w/2-(east+west)*scale/2,oy=(top+bottom)/2+(south+north)*scale/2;
 if(image.naturalWidth){const world=360*scale;let left=(ox-180*scale)%world;if(left>0)left-=world;for(;left<w;left+=world)ctx.drawImage(image,left,oy-90*scale,world,180*scale);}
 ctx.beginPath();points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](ox+x*scale,oy-y*scale));ctx.strokeStyle='#ffce83';ctx.lineWidth=2;ctx.stroke();
 nodes.forEach(([x,y],i)=>{x=ox+x*scale;y=oy-y*scale;ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);ctx.fillStyle='#ffe1a6';ctx.fill();ctx.font='bold 12px system-ui';ctx.strokeStyle='#09111c';ctx.lineWidth=4;ctx.strokeText(journey[i],x+6,y-6);ctx.fillText(journey[i],x+6,y-6);});
 document.querySelector('#summary').textContent=journey.join(' → ')+' · '+Math.round(total).toLocaleString('en-US')+' km · '+(journey.length===2?'Nonstop':(journey.length-2)+' stop'+(journey.length>3?'s':''));
}
new ResizeObserver(draw).observe(document.querySelector('.planner'));window.addEventListener('resize',draw);update();
