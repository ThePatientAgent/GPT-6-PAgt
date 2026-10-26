/* COSMOS v211 — living reflection nebula and shape-locked accretion plasma.
 * Native world projection and clocks; no additional images, libraries or animation loops.
 */
(() => {
  'use strict';
  const vertex = `attribute vec2 a_position;varying vec2 v_uv;
    void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const noise = `
    uniform sampler2D u_noise;
    float noise3(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      vec2 rg=texture2D(u_noise,(i.xy+vec2(37.,17.)*i.z+f.xy+.5)/256.).rg;
      return mix(rg.r,rg.g,f.z);
    }
    float fbm(vec3 p){
      float f=.55*noise3(p);p=p*2.03+vec3(9.2,13.1,7.4);
      f+=.28*noise3(p);return f+.17*noise3(p*2.01+11.7);
    }
  `;
  function program(gl,vs,fs,attributes){
    const shaders=[ [gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs] ].map(([type,source])=>{
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
    });
    const p=gl.createProgram();for(const s of shaders)gl.attachShader(p,s);
    attributes.forEach((name,i)=>gl.bindAttribLocation(p,i,name));gl.linkProgram(p);
    for(const s of shaders)gl.deleteShader(s);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  function seedNoise(gl,unit){
    const values=new Uint8Array(65536),pixels=new Uint8Array(65536*4);let seed=2111026;
    for(let i=0;i<values.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;values[i]=seed&255;}
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const k=(y*256+x)*4;pixels[k]=values[y*256+x];
      pixels[k+1]=values[((y+17)&255)*256+((x+37)&255)];pixels[k+3]=255;
    }
    const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);return tex;
  }
  function triangle(gl){
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);return b;
  }
  function context(canvas,alpha){return canvas.getContext('webgl',{
    alpha,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,
    preserveDrawingBuffer:false,powerPreference:'high-performance'
  });}

  const cloudFragment = `precision highp float;varying vec2 v_uv;
    uniform vec2 u_view;uniform vec3 u_eye,u_right,u_up,u_forward,u_axis,u_drift;
    uniform vec2 u_spin;uniform float u_depth,u_time,u_alpha;
    ${noise}
    vec3 unturn(vec3 p){
      return p*u_spin.x-cross(u_axis,p)*u_spin.y+u_axis*dot(u_axis,p)*(1.-u_spin.x);
    }
    float illumination(vec3 p){
      float e=.11;
      e+=.27/(.17+dot(p-vec3(-.53,.37,.48),p-vec3(-.53,.37,.48)));
      e+=.20/(.17+dot(p-vec3(-.11,.57,-.14),p-vec3(-.11,.57,-.14)));
      e+=.24/(.17+dot(p-vec3(.62,.08,.25),p-vec3(.62,.08,.25)));
      e+=.23/(.17+dot(p-vec3(.14,-.20,.64),p-vec3(.14,-.20,.64)));
      e+=.30/(.17+dot(p-vec3(.03,.08,-.02),p-vec3(.03,.08,-.02)));
      return e;
    }
    void main(){
      vec2 screen=(v_uv*2.-1.)*vec2(u_view.x/u_view.y,1.)/1.5;
      vec3 ray=normalize(u_forward+u_right*screen.x+u_up*screen.y);
      vec3 eye=u_eye-u_drift;
      float b=dot(eye,ray),c=dot(eye,eye)-3.61,d=b*b-c;
      if(d<=0.){gl_FragColor=vec4(0.);return;}
      float entry=max(.05,-b-sqrt(d)),exit=-b+sqrt(d);
      if(exit<=entry){gl_FragColor=vec4(0.);return;}
      vec3 color=vec3(0.);float absorption=0.;
      float stepSize=(exit-entry)/4.;
      for(int i=0;i<4;i++){
        vec3 p=unturn(eye+ray*(entry+(float(i)+.5)*stepSize));
        float edge=exp(-dot(p*vec3(.85,1.02,.8),p*vec3(.85,1.02,.8))*1.7);
        vec3 drift=vec3(u_time*.072,-u_time*.043,u_time*.025);
        float warp=fbm(p*2.2+drift);
        float field=fbm(p*4.2+vec3(warp*1.8,warp*.8,-warp)+drift*.7);
        float ridges=pow(1.-abs(2.*fbm(p*vec3(6.,16.,8.)+warp*2.-drift)-1.),4.);
        float fine=noise3(p*31.+warp*3.+drift);
        float dust=smoothstep(.36,.76,field);
        float density=(dust*.75+ridges*.28)*edge*stepSize;
        float light=illumination(p);
        vec3 blue=mix(vec3(.012,.065,.24),vec3(.16,.42,.95),clamp(light*.38,0.,1.));
        color+=blue*density*(1.35+fine*.35)*exp(-absorption);
        absorption+=density*.30;
      }
      color=(1.-exp(-color*1.08))*u_alpha;
      float alpha=clamp(max(color.b,max(color.r,color.g))*.78,0.,.78);
      gl_FragColor=vec4(color,alpha);
    }
  `;
  const starVertex = `
    attribute vec2 a_position,a_uv;attribute vec3 a_star;varying vec2 v_local;varying vec3 v_star;
    void main(){v_local=a_uv;v_star=a_star;gl_Position=vec4(a_position,0.,1.);}
  `;
  const starFragment = `precision highp float;varying vec2 v_local;varying vec3 v_star;
    uniform float u_time,u_alpha;
    void main(){
      float r=length(v_local),strength=v_star.x;
      float twinkle=.965+.035*sin(u_time*.7+v_star.y);
      if(v_star.z<.5){
        vec3 small=vec3(.68,.80,1.)*exp(-r*r*6.)*strength*twinkle*u_alpha;
        gl_FragColor=vec4(small,0.);return;
      }
      float core=exp(-r*r*500.);
      float shoulder=exp(-r*24.)*.8;
      float halo=exp(-r*5.2)*.24;
      vec2 q=mat2(.976,-.218,.218,.976)*v_local;
      float rays=(exp(-abs(q.x)*210.)*exp(-abs(q.y)*3.8)
                 +exp(-abs(q.y)*210.)*exp(-abs(q.x)*3.8))*.25*v_star.z;
      vec3 rgb=(vec3(.78,.91,1.)*(core*2.2+shoulder)
                +vec3(.17,.44,1.)*halo+vec3(.48,.72,1.)*rays)*strength*twinkle*u_alpha;
      rgb*=1.-smoothstep(.75,1.,r);
      gl_FragColor=vec4(rgb,0.);
    }
  `;
  class PleiadesRenderer {
    constructor(host){
      this.host=host;this.canvas=document.createElement('canvas');this.canvas.className='cosmos-pleiades-v211';
      this.canvas.setAttribute('aria-hidden','true');
      this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;display:none';
      host.appendChild(this.canvas);this.available=false;this.motion=matchMedia('(prefers-reduced-motion: reduce)');
      this.gl=context(this.canvas,true);
      if(this.gl)try{this.initialize();}catch(e){console.warn('COSMOS nebula keeps native fallback',e);}
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.canvas.style.display='none';host.classList.remove('cosmos-pleiades-gpu');});
      this.canvas.addEventListener('webglcontextrestored',()=>{try{this.initialize();}catch(e){console.warn(e);}});
    }
    initialize(){
      const gl=this.gl;this.cloud=program(gl,vertex,cloudFragment,['a_position']);
      this.stars=program(gl,starVertex,starFragment,['a_position','a_uv','a_star']);
      this.cloudUniforms={};for(const n of ['u_noise','u_view','u_eye','u_right','u_up','u_forward','u_axis','u_drift','u_spin','u_depth','u_time','u_alpha'])this.cloudUniforms[n]=gl.getUniformLocation(this.cloud,n);
      this.starUniforms={};for(const n of ['u_time','u_alpha'])this.starUniforms[n]=gl.getUniformLocation(this.stars,n);
      gl.useProgram(this.cloud);this.fullscreen=triangle(gl);this.noise=seedNoise(gl,0);
      gl.uniform1i(this.cloudUniforms.u_noise,0);this.starBuffer=gl.createBuffer();this.vertices=new Float32Array(6*7*192);
      gl.disable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);this.available=true;
      this.canvas.dataset.renderer='webgl-volume-reflection-nebula';this.host.classList.add('cosmos-pleiades-gpu');
    }
    project(data){this.data=data;this.canvas.style.display=this.available&&data.alpha>.015?'block':'none';}
    draw(now){
      const d=this.data;if(!this.available||!d||d.alpha<=.015||document.hidden)return;
      const gl=this.gl,t=this.motion.matches||d.motion===false?0:now*.001;
      const scale=Math.min(d.width<700?1.2:1,1440/d.width,1100/d.height);
      const w=Math.round(d.width*scale),h=Math.round(d.height*scale);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);}
      gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.cloud);gl.bindBuffer(gl.ARRAY_BUFFER,this.fullscreen);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);gl.disable(gl.BLEND);
      const u=this.cloudUniforms;gl.uniform2f(u.u_view,d.width,d.height);
      gl.uniform3fv(u.u_eye,d.eye);gl.uniform3fv(u.u_right,d.camera.right);gl.uniform3fv(u.u_up,d.camera.up);
      gl.uniform3fv(u.u_forward,d.camera.forward);gl.uniform3fv(u.u_axis,d.axis);gl.uniform3fv(u.u_drift,d.drift);
      gl.uniform2f(u.u_spin,Math.cos(d.angle),Math.sin(d.angle));gl.uniform1f(u.u_time,t);gl.uniform1f(u.u_alpha,d.alpha);
      gl.drawArrays(gl.TRIANGLES,0,3);
      let k=0;const corners=[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];
      for(const s of d.stars){
        const radius=s.radius;
        if(s.x+radius<0||s.x-radius>d.width||s.y+radius<0||s.y-radius>d.height)continue;
        for(const [x,y]of corners){this.vertices[k++]=(s.x+x*radius)/d.width*2-1;this.vertices[k++]=1-(s.y+y*radius)/d.height*2;
          this.vertices[k++]=x;this.vertices[k++]=y;this.vertices[k++]=s.strength;this.vertices[k++]=s.phase;this.vertices[k++]=s.rays;}
      }
      gl.useProgram(this.stars);gl.bindBuffer(gl.ARRAY_BUFFER,this.starBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,this.vertices.subarray(0,k),gl.DYNAMIC_DRAW);
      for(const [i,size,offset] of [[0,2,0],[1,2,8],[2,3,16]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,28,offset);}
      gl.uniform1f(this.starUniforms.u_time,t);gl.uniform1f(this.starUniforms.u_alpha,d.alpha);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,k/7);gl.disable(gl.BLEND);
      this.canvas.dataset.phase=t.toFixed(2);
    }
  }

  const accretionFragment = `precision highp float;varying vec2 v_uv;
    uniform sampler2D u_atlas,u_nextAtlas;uniform float u_cycle,u_time;${noise}
    void main(){
      vec2 uv=clamp(vec2(v_uv.x,1.-v_uv.y),vec2(.5/620.,.5/420.),vec2(619.5/620.,419.5/420.));
      vec3 base=mix(texture2D(u_atlas,uv).rgb,texture2D(u_nextAtlas,uv).rgb,fract(u_cycle));
      float peak=max(base.r,max(base.g,base.b));
      if(peak<.002){gl_FragColor=vec4(0.,0.,0.,1.);return;}
      vec2 p=(uv*vec2(620.,420.)-vec2(310.,214.))/vec2(109.,111.);
      float band=exp(-pow((p.y-.25)*3.4,2.));
      vec2 disk=vec2(p.x,(p.y-.25)*mix(1.,4.2,band));
      float radius=length(disk),phi=atan(disk.y,disk.x);
      float orbit=u_time*1.85/(.55+radius*.65);
      vec3 q=vec3(cos(phi-orbit)*3.8,sin(phi-orbit)*3.8,radius*16.-u_time*.35);
      vec3 front=vec3(p.x*1.3-u_time*1.65/(.8+abs(p.y-.25)*3.),(p.y-.25)*39.,u_time*.16);
      q=mix(q,front,band);
      float field=fbm(q),fine=noise3(q*vec3(2.8,2.8,3.5)+field*2.3);
      float flow=fbm(q*vec3(1.2,1.2,1.9)+vec3(field*2.1,-field*.7,field*1.7));
      float threads=pow(smoothstep(.27,.73,flow),2.);
      float knots=smoothstep(.54,.82,field)*(.45+.55*fine);
      float active=smoothstep(.12,.73,peak);
      float energy=.48+.70*field+.74*threads+knots*.95;
      vec3 flowing=base*mix(1.,energy,active);
      vec3 hot=vec3(1.,.92,.70)*pow(knots,1.6)*active*.52;
      flowing+=hot;
      // Color changes at the exact V13 pixel; no coordinate warp or displaced glow.
      flowing=mix(base,flowing,smoothstep(.02,.24,peak));
      gl_FragColor=vec4(clamp(flowing,0.,1.),1.);
    }
  `;
  class AccretionRenderer {
    constructor(fallback,atlas,onCanvas){
      this.fallback=fallback;this.atlas=atlas;this.onCanvas=onCanvas;this.available=false;
      this.canvas=document.createElement('canvas');this.canvas.width=620;this.canvas.height=420;
      this.gl=context(this.canvas,false);
      if(this.gl)try{this.initialize();this.activate();}catch(e){console.warn('COSMOS accretion keeps V13 fallback',e);}
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;
        this.swap(this.canvas,this.fallback);this.fallback.dataset.renderer='canvas2d-radiant-plasma';delete this.fallback.dataset.flow;});
      this.canvas.addEventListener('webglcontextrestored',()=>{try{this.initialize();this.activate();}catch(e){console.warn(e);}});
    }
    swap(from,to){
      if(!from.isConnected)return;
      for(const attr of [...from.attributes])if(attr.name!=='width'&&attr.name!=='height')to.setAttribute(attr.name,attr.value);
      from.replaceWith(to);this.onCanvas(to);
    }
    activate(){
      this.swap(this.fallback,this.canvas);this.canvas.dataset.renderer='webgl-differential-accretion';
      this.canvas.dataset.flow='shape-locked-orbital-filaments';
    }
    initialize(){
      const gl=this.gl;if(gl.getParameter(gl.MAX_TEXTURE_SIZE)<620)throw Error('V13 frame exceeds GPU texture limit');
      this.program=program(gl,vertex,accretionFragment,['a_position']);gl.useProgram(this.program);triangle(gl);
      this.time=gl.getUniformLocation(this.program,'u_time');this.cycle=gl.getUniformLocation(this.program,'u_cycle');
      this.noise=seedNoise(gl,1);gl.uniform1i(gl.getUniformLocation(this.program,'u_noise'),1);
      this.stage=document.createElement('canvas');this.stage.width=620;this.stage.height=420;
      this.stageContext=this.stage.getContext('2d',{alpha:false,willReadFrequently:true});
      this.textures=[0,1].map(()=>{
        const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,620,420,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        return {texture,frame:-1};
      });
      gl.uniform1i(gl.getUniformLocation(this.program,'u_atlas'),0);
      gl.uniform1i(gl.getUniformLocation(this.program,'u_nextAtlas'),2);
      this.resize();gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);this.available=true;
    }
    resize(){
      const target=this.canvas.isConnected?this.canvas:this.fallback,box=target.getBoundingClientRect();
      const w=Math.min(1240,Math.max(620,Math.ceil(box.width*Math.min(devicePixelRatio||1,2)))),h=Math.round(w*420/620);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
      this.gl.viewport(0,0,w,h);
    }
    upload(slot,frame){
      const g=this.stageContext,gl=this.gl;
      g.drawImage(this.atlas,frame%6*620,Math.floor(frame/6)*420,620,420,0,0,620,420);
      const pixels=g.getImageData(0,0,620,420);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,slot.texture);
      gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,620,420,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(pixels.data.buffer));slot.frame=frame;
    }
    draw(cycle,time){
      const gl=this.gl,frame=Math.floor(cycle)%48,next=(frame+1)%48;
      let a=this.textures.find(s=>s.frame===frame),b=this.textures.find(s=>s.frame===next);
      if(!a){a=this.textures.find(s=>s!==b);this.upload(a,frame);}
      if(!b){b=this.textures.find(s=>s!==a);this.upload(b,next);}
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,a.texture);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,b.texture);
      this.resize();gl.uniform1f(this.cycle,cycle);gl.uniform1f(this.time,time);gl.drawArrays(gl.TRIANGLES,0,3);
      this.canvas.dataset.frameTextures='2';this.canvas.dataset.texturePixels=String(620*420*2);
    }
  }
  window.CosmosPleiadesRenderer=PleiadesRenderer;
  window.CosmosAccretionRenderer=AccretionRenderer;
})();
