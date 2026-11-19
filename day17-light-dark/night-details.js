import * as THREE from './vendor/three.module.js';
import {tileVertexShader} from './tile-vertex.js';

// Draw the night mosaic independently of the much smaller daytime detail cache.
export function nightDetails(scene, common, loader){
 const geometry=new THREE.PlaneGeometry(1,1,8,8);
 const live=new Map(),pending=new Set(),retry=new Map();
 let queue=[],wanted=new Set(),last='';
 const shader=`
 varying vec2 screen;
 uniform vec3 bounds,sun;
 uniform vec2 center,size;
 uniform float radius,progress,opacity;
 uniform sampler2D lamp;
 void main(){
   vec2 disc=(screen-vec2(.5,.5+.012*progress))*size/radius;
   float z2=1.-dot(disc,disc); if(z2<=0.)discard;
   float z=sqrt(z2),c=cos(center.y),s=sin(center.y);
   float lat=asin(disc.y*c+z*s);
   float lon=center.x+atan(disc.x,z*c-disc.y*s);
   vec2 uv=(vec2(mod(degrees(lon)+180.,360.)-180.,degrees(lat))-bounds.xy)/bounds.z;
   if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.)discard;
   float light=dot(sun,vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon)));
   float darkness=1.-smoothstep(-.16,.04,light);
   if(darkness<.001)discard;
   vec3 rgb=texture2D(lamp,uv).rgb;
   rgb=max(rgb,vec3(.032,.052,.086));
   float warm=exp(-pow(abs(light+.012)/.105,2.));
   rgb+=warm*vec3(.075,.031,.008);
   gl_FragColor=vec4(rgb*(.83+.17*z),darkness*opacity);
 }`;
 async function load(tile){
   pending.add(tile.key);
   try{
     const tex=await loader.loadAsync('./assets/night-mosaic/'+tile.key+'.jpg');
     if(!wanted.has(tile.key)){tex.dispose();return;}
     const material=new THREE.ShaderMaterial({uniforms:{...common,bounds:{value:new THREE.Vector3(tile.x,tile.y,6)},lamp:{value:tex},opacity:{value:0}},vertexShader:tileVertexShader,fragmentShader:shader,transparent:true,depthWrite:false,depthTest:false});
     const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=3;
     scene.add(mesh);live.set(tile.key,{mesh,tex,born:performance.now()});
   }catch{retry.set(tile.key,Date.now()+60000);}finally{pending.delete(tile.key);}
 }
 return function update(t,lon,lat,radius,w,h,dpr,zoom){
   if(t<.98)return;
   const key=[Math.round(lon),Math.round(lat),Math.round(radius/15),w,h,dpr].join('/');
   if(key!==last){
     last=key;queue=[];
     const rad=Math.PI/180,phi=lat*rad;
     const density=radius*dpr*rad;
     const size=(zoom>=3.5 || density>115)?1440:density>52?720:360;
     for(let row=1;row<15;row++)for(let col=0;col<60;col++){
       const x=-180+6*col,y=84-6*row,cx=x+3,cy=y+3;
       if(!((cx>=-39&&cx<=75&&cy>=15&&cy<=81)||(cx>=87&&cx<=171&&cy>=3&&cy<=69)||(cx>=-147&&cx<=-45&&cy>=9&&cy<=69)))continue;
       const delta=(cx-lon)*rad,p=cy*rad;
       const z=Math.sin(p)*Math.sin(phi)+Math.cos(p)*Math.cos(phi)*Math.cos(delta);
       if(z<-.08)continue;
       const sx=radius*Math.cos(p)*Math.sin(delta),sy=radius*(Math.sin(p)*Math.cos(phi)-Math.cos(p)*Math.cos(delta)*Math.sin(phi));
       const margin=radius*.08;
       if(Math.abs(sx)>w/2+margin||Math.abs(sy)>h*.52+margin)continue;
       queue.push({x,y,key:col+'_'+row+'_'+size,dist:sx*sx+sy*sy});
     }
     queue.sort((a,b)=>a.dist-b.dist);wanted=new Set(queue.map(tile=>tile.key));
     for(const [id,item] of live)if(!wanted.has(id)){scene.remove(item.mesh);item.mesh.material.dispose();item.tex.dispose();live.delete(id);}
   }
   const now=performance.now();
   for(const item of live.values())item.mesh.material.uniforms.opacity.value=Math.min(1,(now-item.born)/600);
   for(const tile of queue){
     if(pending.size>=4)break;
     if(!live.has(tile.key)&&!pending.has(tile.key)&&(retry.get(tile.key)||0)<Date.now())load(tile);
   }
 };
}
