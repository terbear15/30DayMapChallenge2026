import * as THREE from './vendor/three.module.js';

export async function earthView(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const loader = new THREE.TextureLoader();
  const images = await Promise.all([renderer.capabilities.maxTextureSize>=16384?'day-globe-hd':'day-globe','night-globe',renderer.capabilities.maxTextureSize>=8192?'day-us-hd':'day-us','night-us'].map(name =>
    loader.loadAsync('./assets/'+name+'.jpg')));
  const uniforms = Object.fromEntries(images.map((value,i)=>[['world','lights','region','localLights'][i],{value}]));
  Object.assign(uniforms,{
    size:{value:new THREE.Vector2()}, radius:{value:1}, center:{value:new THREE.Vector2()},
    sun:{value:new THREE.Vector3()}, progress:{value:0}
  });
  const material = new THREE.ShaderMaterial({uniforms,
    vertexShader:'varying vec2 screen; void main(){screen=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 screen;
      uniform vec2 size,center;
      uniform float radius,progress;
      uniform vec3 sun;
      uniform sampler2D world,lights,region,localLights;
      float hash(vec2 p){return fract(sin(dot(mod(p,211.),vec2(127.1,311.7)))*43758.5453);}
      float noiseField(vec2 p){
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      vec3 sky(vec2 p){
        vec2 q=p/size.y;
        float dust=noiseField(q*4.)*.54+noiseField(q*11.)*.29+noiseField(q*33.)*.12+noiseField(q*90.)*.05;
        float band=exp(-pow(abs(q.y-.26*q.x-.18+(dust-.5)*.5)*4.,2.));
        vec3 cloud=vec3(.17,.115,.16)*smoothstep(.30,.78,dust)*band;
        vec2 cell=floor(p/7.);
        float seed=hash(cell);
        vec2 pos=(vec2(hash(cell+17.),hash(cell+71.))-.5)*.65;
        float dist=length(fract(p/7.)-.5-pos)*7.;
        float star=step(.969-.065*band*dust,seed)*exp(-dist*dist*1.5);
        return vec3(.008,.009,.016)+.5*cloud+star*mix(vec3(.55,.62,.72),vec3(.94,.84,.68),seed);
      }
      void main(){
        vec2 disc=(screen-vec2(.5,.5+.012*progress))*size/radius;
        float r2=dot(disc,disc);
        if(r2>=1.){gl_FragColor=vec4(.5*sky(screen*size),1.);return;}
        float z=sqrt(1.-r2), c=cos(center.y),s=sin(center.y);
        float lat=asin(disc.y*c+z*s);
        float lon=center.x+atan(disc.x,z*c-disc.y*s);
        vec2 globe=vec2(fract(lon/6.2831853+.5),lat/3.14159265+.5);
        vec2 local=(degrees(vec2(lon,lat))-vec2(-132.,20.))/vec2(72.,36.);
        vec2 edge=min(local,1.-local);
        float inset=smoothstep(0.,.025,min(edge.x,edge.y));
        vec3 day=mix(texture2D(world,globe).rgb,texture2D(region,local).rgb,inset);
        vec3 night=mix(texture2D(lights,globe).rgb,texture2D(localLights,local).rgb,inset);
        float illumination=dot(vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon)),sun);
        day=mix(vec3(dot(day,vec3(.2126,.7152,.0722))),day,.36+.24*progress);
        float terrain=dot(day,vec3(.2126,.7152,.0722));
        night=max(night,vec3(.024,.044,.082)+terrain*vec3(.055,.085,.13));
        float direct=sqrt(max(illumination,0.));
        day*=.63+.52*direct;
        float twilight=exp(-pow(abs(illumination+.012)/.105,2.));
        vec3 surface=mix(night,day,smoothstep(-.16,.12,illumination));
        surface+=twilight*vec3(.075,.031,.008);
        gl_FragColor=vec4(surface*(.83+.17*z),1.);
      }`});
  const scene=new THREE.Scene(),camera=new THREE.Camera();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  return function render(t,lon,lat,zoom,solar){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(uniforms.size.value.x!==w || uniforms.size.value.y!==h){
      renderer.setSize(w,h,false); uniforms.size.value.set(w,h);
    }
    const eased=t*t*(3-2*t);
    const from=Math.min(w,h)*.32, to=Math.min(w*1.04,h*1.64)*zoom;
    uniforms.radius.value=from*Math.pow(to/from,eased);
    uniforms.center.value.set((18+(lon-18)*eased)*Math.PI/180,(8+(lat-8)*eased)*Math.PI/180);
    uniforms.progress.value=eased;
    uniforms.sun.value.fromArray(solar);
    renderer.render(scene,camera);
  };
}
