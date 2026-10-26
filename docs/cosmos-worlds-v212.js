/* COSMOS v212: shared Kepler paths, living Orion, luminous galactic nucleus.
 * Native perspective and frame clock; existing approved renderers are independent.
 */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
  const orbits=[
    {slot:0,name:'EARTH',a:.86,e:.02,inclination:0,node:0,phase:4.765},
    {slot:1,name:'SATURN',a:1.20,e:.04,inclination:.0436,node:.65,phase:5.236},
    {slot:3,name:'NEPTUNE',a:1.55,e:.01,inclination:.0314,node:-.45,phase:5.986}
  ];
  const U=[1,0,0],V=[0,.20,Math.sqrt(.96)],N=[0,-Math.sqrt(.96),.20];
  for(const o of orbits){
    const c=Math.cos(o.node),s=Math.sin(o.node),ci=Math.cos(o.inclination),si=Math.sin(o.inclination);
    o.u=U.map((v,i)=>v*c+V[i]*s);
    o.v=V.map((v,i)=>(v*c-U[i]*s)*ci+N[i]*si);
    o.speed=.000035/Math.pow(o.a/.86,1.5);
  }
  function eccentric(o,t){
    const M=((o.phase+t*o.speed)%TAU+TAU)%TAU;let E=M;
    for(let i=0;i<4;i++)E-=(E-o.e*Math.sin(E)-M)/(1-o.e*Math.cos(E));return E;
  }
  function point(o,E,base){
    const x=o.a*(Math.cos(E)-o.e),y=o.a*Math.sqrt(1-o.e*o.e)*Math.sin(E);
    return base.map((v,i)=>v+o.u[i]*x+o.v[i]*y);
  }
  const OrbitModel={orbits,eccentric,point,position(slot,t,base){const o=orbits.find(o=>o.slot===slot);return o?point(o,eccentric(o,t),base):null;}};
  const NS='http://www.w3.org/2000/svg';
  function svg(tag,attrs){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));return e;}
  class OrbitRenderer {
    constructor(host){
      this.svg=svg('svg',{'aria-hidden':'true',class:'cosmos-solar-orbits-v212'});
      this.svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:2;display:none';
      const defs=svg('defs'),mask=svg('mask',{id:'cosmos-orbit-mask-v212',maskUnits:'userSpaceOnUse',x:0,y:0});
      this.mask=mask;this.field=svg('rect',{x:0,y:0,fill:'white'});this.shadow=svg('circle',{fill:'black'});
      mask.append(this.field,this.shadow);defs.appendChild(mask);this.svg.appendChild(defs);
      this.group=svg('g',{fill:'none','stroke-width':'.85','stroke-linecap':'round',mask:'url(#cosmos-orbit-mask-v212)'});
      this.paths=orbits.map(o=>[false,true].map(front=>{
        const p=svg('path',{'data-body':o.name,'data-side':front?'front':'back',stroke:front?'#8dbfdb':'#6b91b8','stroke-opacity':front?'.30':'.17','vector-effect':'non-scaling-stroke'});
        this.group.appendChild(p);return p;
      }));
      this.svg.appendChild(this.group);host.appendChild(this.svg);this.svg.dataset.model='shared-kepler-perspective';this.previous='';
    }
    hide(){this.svg.style.display='none';this.data=null;}
    project(d){
      this.data=d;if(d.alpha<=.015){this.hide();return;}
      this.svg.style.display='block';this.svg.style.opacity=d.alpha.toFixed(3);
      const key=[d.width,d.height,...d.camera.eye,...d.camera.forward,...d.camera.right,d.sunRadius].join(',');
      if(key===this.previous)return;this.previous=key;
      this.svg.setAttribute('viewBox',`0 0 ${d.width} ${d.height}`);
      this.mask.setAttribute('width',d.width);this.mask.setAttribute('height',d.height);
      this.field.setAttribute('width',d.width);this.field.setAttribute('height',d.height);
      this.shadow.setAttribute('cx',d.sun.x);this.shadow.setAttribute('cy',d.sun.y);this.shadow.setAttribute('r',d.sunRadius+6);
      for(let j=0;j<orbits.length;j++){
        const pieces=['',''];let last=null;
        for(let k=0;k<=128;k++){
          const p=d.project(point(orbits[j],k/128*TAU,d.base));
          if(p&&last){const side=(p.z+last.z)*.5<d.sun.z?1:0;
            pieces[side]+=`M${last.x.toFixed(2)},${last.y.toFixed(2)}L${p.x.toFixed(2)},${p.y.toFixed(2)}`;}
          last=p;
        }
        for(let side=0;side<2;side++)this.paths[j][side].setAttribute('d',pieces[side]);
      }
    }
  }

  const vertex=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const noise=`uniform sampler2D u_noise;
    float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      vec2 rg=texture2D(u_noise,(i.xy+vec2(37.,17.)*i.z+f.xy+.5)/256.).rg;return mix(rg.r,rg.g,f.z);}
    float fbm(vec3 p){float f=.55*noise3(p);p=p*2.03+vec3(9.2,13.1,7.4);f+=.28*noise3(p);return f+.17*noise3(p*2.01+11.7);}
  `;
  const projection=`varying vec2 v_uv;uniform vec2 u_view;uniform vec3 u_eye,u_right,u_up,u_forward;
    uniform float u_time,u_alpha;
    vec3 viewRay(){vec2 q=(v_uv*2.-1.)*vec2(u_view.x/u_view.y,1.)/1.5;return normalize(u_forward+u_right*q.x+u_up*q.y);}
    vec2 intersectSphere(vec3 ray,float radius){float b=dot(u_eye,ray),d=b*b-dot(u_eye,u_eye)+radius*radius;
      if(d<=0.)return vec2(0.);return vec2(max(.02,-b-sqrt(d)),-b+sqrt(d));}
  `;
  const orionFragment=`precision highp float;${projection}${noise}
    void main(){
      vec3 ray=viewRay();vec2 range=intersectSphere(ray,2.45);
      if(range.y<=range.x){gl_FragColor=vec4(0.);return;}
      float stepSize=(range.y-range.x)/5.;vec3 light=vec3(0.);float opacity=0.;
      for(int i=0;i<5;i++){
        vec3 p=u_eye+ray*(range.x+(float(i)+.5)*stepSize);
        vec3 drift=vec3(u_time*.058,-u_time*.037,u_time*.024);
        float warp=fbm(p*2.5+drift),field=fbm(p*4.1+vec3(warp*2.,-warp,warp*.8)-drift*.5);
        float threads=pow(1.-abs(fbm(p*vec3(7.,13.,8.)+warp*2.+drift)*2.-1.),4.);
        float radius=length(p*vec3(.86,.86,1.05));
        float envelope=exp(-radius*radius*.77);
        float cavity=1.-exp(-dot(p,p)*6.);
        float gas=(smoothstep(.29,.77,field)*.82+threads*.27)*envelope*(.48+.52*cavity)*stepSize;
        float lane=exp(-pow((p.x+.23+p.y*.43+(warp-.5)*.55)/.13,2.))*smoothstep(-.25,.8,p.y);
        float ionization=clamp(1.1-radius*.65+(warp-.5)*.9,0.,1.);
        vec3 hydrogen=vec3(.91,.075,.27),oxygen=vec3(.08,.50,.83);
        vec3 color=mix(hydrogen,oxygen,ionization);
        color=mix(color,vec3(.74,.60,.88),pow(ionization,5.)*.55);
        float illumination=.60+1.1/(.27+dot(p,p)*2.);
        light+=color*gas*illumination*(1.-lane*.72)*exp(-opacity);
        opacity+=gas*.22+lane*envelope*stepSize*.25;
      }
      vec3 rgb=(1.-exp(-light*2.1))*u_alpha;
      gl_FragColor=vec4(rgb,clamp(max(rgb.r,max(rgb.g,rgb.b))*.91,0.,.92));
    }`;
  const coreFragment=`precision highp float;${projection}${noise}
    void main(){
      vec3 ray=viewRay();vec2 range=intersectSphere(ray,3.25);
      if(range.y<=range.x){gl_FragColor=vec4(0.);return;}
      vec3 light=vec3(0.);float opacity=0.;
      float slope=abs(ray.y);float stepSize=.085/max(.16,slope);
      float along=-u_eye.y/(abs(ray.y)>.025?ray.y:(ray.y<0.?-.025:.025));
      vec3 plane=u_eye+ray*along;
      for(int i=0;i<5;i++){
        float height=(float(i)-2.)*.085;
        // Thin-disk column integration avoids visible stacks of separate spiral sheets.
        vec3 p=vec3(plane.x,height,plane.z);
        float r=length(p.xz),angle=atan(p.z,p.x);
        float differential=u_time*.12/(.7+r*.55);
        vec3 flow=vec3(cos(angle-differential)*r,p.y,sin(angle-differential)*r);
        float warp=fbm(flow*3.1+vec3(0.,u_time*.025,0.));
        float structure=fbm(flow*8.+warp*1.9);
        float spiral=angle-r*2.8-differential+(warp-.5)*.8;
        float arms=pow(.5+.5*cos(spiral*2.),8.);
        float lanes=pow(.5+.5*cos((spiral+.27)*2.),14.);
        float disk=exp(-height*height*38.)*exp(-r*r*.24)*smoothstep(.13,.42,r)
                  *(1.-smoothstep(2.5,3.1,r))*step(.02,along);
        float knots=smoothstep(.47,.75,structure);
        vec3 color=mix(vec3(.18,.29,.62),vec3(.83,.38,.25),knots);
        color=mix(color,vec3(1.,.78,.43),exp(-r*1.4));
        float density=disk*(.025+arms*(.37+structure*.85))*stepSize;
        light+=color*density*4.5*exp(-opacity);
        opacity+=disk*lanes*(.50+structure*.85)*stepSize;
      }
      // Integrated stellar bulge: remains smooth when the camera crosses volume slices.
      vec3 eye=u_eye*vec3(1.,1.7,1.),weightedRay=ray*vec3(1.,1.7,1.);
      float at=max(0.,-dot(eye,weightedRay)/dot(weightedRay,weightedRay));
      vec3 near=eye+weightedRay*at;float d=dot(near,near);
      float bulge=4.5*exp(-d*43.)+.39*exp(-d*6.2)+.045*exp(-d*1.2);
      light+=vec3(1.,.87,.62)*bulge*exp(-opacity*.65);
      vec3 rgb=(1.-exp(-light*1.35))*u_alpha;
      gl_FragColor=vec4(rgb,clamp(max(max(rgb.r,max(rgb.g,rgb.b))*.97,1.-exp(-opacity)),0.,.98));
    }`;
  const starVertex=`attribute vec2 a_position,a_uv;attribute vec4 a_star;varying vec2 v_local;varying vec4 v_star;
    void main(){v_local=a_uv;v_star=a_star;gl_Position=vec4(a_position,0.,1.);}`;
  const starFragment=`precision highp float;varying vec2 v_local;varying vec4 v_star;uniform float u_time,u_alpha;
    void main(){float r=length(v_local),pulse=.97+.03*sin(u_time*.8+v_star.y);
      vec3 color=mix(vec3(.71,.86,1.),vec3(1.,.80,.53),v_star.w);
      if(v_star.z<.5){gl_FragColor=vec4(color*exp(-r*r*6.)*v_star.x*pulse*u_alpha,0.);return;}
      float core=exp(-r*r*590.)*2.2+exp(-r*25.)*.7;
      float halo=exp(-r*5.4)*.19;
      vec2 p=mat2(.986,-.167,.167,.986)*v_local;
      float rays=(exp(-abs(p.x)*220.)*exp(-abs(p.y)*4.)+exp(-abs(p.y)*220.)*exp(-abs(p.x)*4.))*.15;
      vec3 rgb=(vec3(.94,.97,1.)*core+color*(halo+rays))*v_star.x*pulse*u_alpha*(1.-smoothstep(.75,1.,r));
      gl_FragColor=vec4(rgb,0.);
    }`;
  function program(gl,vs,fs,attrs){
    const shaders=[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]].map(([type,source])=>{
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;});
    const p=gl.createProgram();for(const s of shaders)gl.attachShader(p,s);attrs.forEach((name,i)=>gl.bindAttribLocation(p,i,name));gl.linkProgram(p);
    for(const s of shaders)gl.deleteShader(s);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  function seedNoise(gl){
    const r=new Uint8Array(65536),p=new Uint8Array(65536*4);let seed=2121026;
    for(let i=0;i<r.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;r[i]=seed&255;}
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4;p[k]=r[y*256+x];p[k+1]=r[((y+17)&255)*256+((x+37)&255)];p[k+3]=255;}
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,p);
    for(const n of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,n,gl.LINEAR);
    for(const n of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,n,gl.REPEAT);return texture;
  }
  class DeepRenderer {
    constructor(host){
      this.host=host;this.canvas=document.createElement('canvas');this.canvas.className='cosmos-deep-v212';this.canvas.setAttribute('aria-hidden','true');
      this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;display:none';host.appendChild(this.canvas);
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.available=false;
      this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
      if(this.gl)try{this.initialize();}catch(e){console.warn('COSMOS deep scenes retain native fallback',e);}
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.canvas.style.display='none';host.classList.remove('cosmos-deep-gpu');});
      this.canvas.addEventListener('webglcontextrestored',()=>{try{this.initialize();}catch(e){console.warn(e);}});
    }
    initialize(){
      const gl=this.gl;this.programs={};this.uniforms={};
      const exotic={...window.CosmosExoticScenes?.shaders(projection,noise),...window.CosmosCygnus?.shaders(projection,noise)};
      for(const [name,fs]of [['orion',orionFragment],['core',coreFragment],...Object.entries(exotic)]){
       try{
        const p=this.programs[name]=program(gl,vertex,fs,['a_position']),u=this.uniforms[name]={};
        for(const n of ['u_view','u_eye','u_right','u_up','u_forward','u_time','u_alpha','u_noise','u_star_a','u_star_b','u_star_axis'])u[n]=gl.getUniformLocation(p,n);
        gl.useProgram(p);gl.uniform1i(u.u_noise,0);
       }catch(error){if(name==='orion'||name==='core')throw error;console.warn('COSMOS optional scene shader',name,error);}
      }
      this.starProgram=program(gl,starVertex,starFragment,['a_position','a_uv','a_star']);
      this.starTime=gl.getUniformLocation(this.starProgram,'u_time');this.starAlpha=gl.getUniformLocation(this.starProgram,'u_alpha');
      this.triangle=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.triangle);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      this.starBuffer=gl.createBuffer();this.vertices=new Float32Array(6*8*192);this.noise=seedNoise(gl);
      gl.disable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);this.available=true;this.host.classList.add('cosmos-deep-gpu');
    }
    project(data){this.data=this.programs?.[data.mode]?data:null;this.canvas.style.display=this.available&&this.data&&data.alpha>.015?'block':'none';}
    draw(now){
      const d=this.data;if(!this.available||!d||d.alpha<=.015||document.hidden)return;
      const exotic=['spica','quasar','cygnus'].includes(d.mode);
      const gl=this.gl,t=this.motion.matches?0:now*.001,scale=Math.min(d.width<700?(exotic?Math.min(devicePixelRatio||1,1.6):1.15):1,(exotic?1600:1440)/d.width,(exotic?1400:1100)/d.height);
      const w=Math.round(d.width*scale),h=Math.round(d.height*scale);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);}
      const u=this.uniforms[d.mode];gl.useProgram(this.programs[d.mode]);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.BLEND);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.triangle);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);
      gl.uniform2f(u.u_view,d.width,d.height);gl.uniform3fv(u.u_eye,d.eye);gl.uniform3fv(u.u_right,d.camera.right);gl.uniform3fv(u.u_up,d.camera.up);gl.uniform3fv(u.u_forward,d.camera.forward);
      gl.uniform1f(u.u_time,t);gl.uniform1f(u.u_alpha,d.alpha);
      if(d.mode==='spica'||d.mode==='cygnus'){
        const orbit=d.mode==='cygnus'?window.CosmosCygnus.orbit(t):window.CosmosExoticScenes.binaryOrbit(t);
        gl.uniform3fv(u.u_star_a,orbit.a);gl.uniform3fv(u.u_star_b,orbit.b);gl.uniform3fv(u.u_star_axis,orbit.axis);
      }
      gl.drawArrays(gl.TRIANGLES,0,3);
      let k=0;const corners=[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];
      for(const s of d.stars){if(s.x+s.radius<0||s.x-s.radius>d.width||s.y+s.radius<0||s.y-s.radius>d.height)continue;
        for(const [x,y]of corners){for(const v of [(s.x+x*s.radius)/d.width*2-1,1-(s.y+y*s.radius)/d.height*2,x,y,s.strength,s.phase,s.rays,s.warm])this.vertices[k++]=v;}}
      if(k){gl.useProgram(this.starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.starBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices.subarray(0,k),gl.DYNAMIC_DRAW);
        for(const [i,size,offset]of [[0,2,0],[1,2,8],[2,4,16]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,32,offset);}
        gl.uniform1f(this.starTime,t);gl.uniform1f(this.starAlpha,d.alpha);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,k/8);gl.disable(gl.BLEND);}
      this.canvas.dataset.renderer={orion:'webgl-ionized-orion',core:'webgl-luminous-galactic-core',spica:'webgl-barycentric-spica',quasar:'webgl-accretion-bipolar-jets',cygnus:'webgl-wind-fed-cygnus'}[d.mode];this.canvas.dataset.phase=t.toFixed(2);
    }
  }
  window.CosmosOrbitModel=OrbitModel;window.CosmosOrbitRenderer=OrbitRenderer;window.CosmosDeepRenderer=DeepRenderer;
})();
