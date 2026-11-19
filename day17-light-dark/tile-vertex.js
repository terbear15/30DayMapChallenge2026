  export const tileVertexShader=`
    varying vec2 screen;
    uniform vec2 size,center;
    uniform float radius,progress;
    uniform vec3 bounds;
    void main(){
      vec2 ll=radians(bounds.xy+uv*bounds.z);
      float delta=ll.x-center.x;
      vec2 disc=vec2(cos(ll.y)*sin(delta),
        sin(ll.y)*cos(center.y)-cos(ll.y)*cos(delta)*sin(center.y));
      screen=vec2(.5,.5+.012*progress)+disc*radius/size;
      gl_Position=vec4(screen*2.-1.,0.,1.);
    }`;
