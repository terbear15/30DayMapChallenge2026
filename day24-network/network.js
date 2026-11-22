import {airports,schedules} from '../day22-projections/routes.js';
const selector=document.querySelector('#airport');
const links=new Map(Object.keys(airports).map(code=>[code,new Map()]));
for(const id of Object.keys(schedules)){
  const [a,b]=id.split('-');
  links.get(a).set(b,id); links.get(b).set(a,id);
}
for(const [code,[city]] of Object.entries(airports)) selector.add(new Option(city+' · '+code,code));
selector.value='LAX';
function draw(){
  const start=selector.value, neighbors=links.get(start);
  const direct=document.querySelector('#direct'), transfers=document.querySelector('#transfer');
  direct.replaceChildren(); transfers.replaceChildren();
  for(const [via,id] of neighbors){
    const item=document.createElement('li'), link=document.createElement('a');
    link.href='../day22-projections/?flight='+id;
    link.textContent=airports[via][0]+' · '+via;
    item.append(link);direct.append(item);
    for(const dest of links.get(via).keys()){
      if(dest===start||neighbors.has(dest))continue;
      const row=document.createElement('li');
      row.textContent=airports[dest][0]+' · '+dest+' via '+via;
      transfers.append(row);
    }
  }
  if(!transfers.childElementCount){const row=document.createElement('li');row.textContent='No onward connection in this collection.';transfers.append(row);}
}
selector.onchange=draw;draw();
