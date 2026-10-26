/* COSMOS v210 — white-hot plasma, quadruple-speed surface; one world-anchored, emissive solar renderer.
 * No assets, libraries, CSS blending, extra animation loop or full-screen bloom.
 * Sphere diameter = 220 in the existing 440px projection, identical to v206.
 */
(() => {
  'use strict';
  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}
  `;
  const fragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_noise;
    uniform float u_time;
    uniform float u_pixel;

    // One filtered RG lookup interpolates two adjacent slices of 3D noise.
    // The seeded, periodic texture is generated locally once, never uploaded per frame.
    float noise3(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      vec2 uv=i.xy+vec2(37.,17.)*i.z+f.xy;
      vec2 rg=texture2D(u_noise,(uv+.5)/256.).rg;
      return mix(rg.r,rg.g,f.z);
    }
    float fbm(vec3 p){
      float f=.53*noise3(p);
      p=p*2.03+vec3(13.1,7.7,19.3);f+=.27*noise3(p);
      p=p*2.01+vec3(5.2,17.9,8.4);f+=.13*noise3(p);
      return f+.07*noise3(p*2.02);
    }
    vec3 palette(float h){
      vec3 c=mix(vec3(.12,.004,.001),vec3(.62,.045,.003),smoothstep(.12,.46,h));
      c=mix(c,vec3(1.,.43,.045),smoothstep(.40,.67,h));
      c=mix(c,vec3(1.,.87,.48),smoothstep(.60,.82,h));
      return mix(c,vec3(1.,.995,.93),smoothstep(.73,.94,h));
    }
    float loopArc(vec2 p,float angle,float width,float height,float phase){
      vec2 axis=vec2(cos(angle),sin(angle));
      vec2 q=vec2(dot(p,vec2(-axis.y,axis.x)),dot(p,axis)-.987);
      float life=.73+.27*sin(u_time*.22+phase);
      vec2 e=q/vec2(width,height*life);
      float d=abs(length(e)-1.);
      float filament=exp(-d*27.)+.22*exp(-d*7.);
      float breakup=.50+.50*noise3(vec3(q*43.,u_time*.22+phase));
      return filament*breakup*smoothstep(-.008,.012,q.y);
    }
    void main(){
      vec2 p=(v_uv-.5)*4.;
      float r=length(p);
      if(r>1.70){gl_FragColor=vec4(0.);return;}
      float aa=u_pixel*1.1;
      float disk=1.-smoothstep(1.-aa,1.+aa,r);
      float t=u_time*4.; // Surface flow doubles v209; prominence timing remains native.
      vec3 rgb=vec3(0.);
      float alpha=0.;
      if(r<1.+aa){
        float z=sqrt(max(0.,1.-r*r));
        vec3 n=vec3(p,z);
        // Slow differential rotation in 3D; the flow itself continues to evolve.
        float spin=t*.018+.12*n.y*n.y;
        n.xz=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*n.xz;
        n.xy=mat2(.981,-.195,.195,.981)*n.xy;
        vec3 s=n*3.8;
        vec3 drift=vec3(t*.043,-t*.029,t*.018);
        vec3 w=vec3(fbm(s*.91+drift),fbm(s*.91+vec3(7.2,3.1,9.4)-drift*.71),
                    fbm(s*.91+vec3(2.8,9.6,4.3)+drift*.83))-.5;
        vec3 flow=s+w*2.3;
        float field=fbm(flow*1.88+drift*.30);
        float filament=1.-smoothstep(.016,.105,abs(field-.51));
        float fire=fbm(flow*4.3+vec3(-t*.03,t*.07,t*.035));
        float granules=noise3(flow*28.+fire*2.5+drift);
        float pools=smoothstep(.46,.72,fbm(s*1.15+vec3(21.4,7.,1.)+drift*.4));
        float heat=.16+.56*field+.40*filament+.13*fire+.08*granules-.23*pools;
        vec3 surface=palette(heat);
        // Emission, not a directional lamp: gentle limb darkening gives volume.
        surface*=.53+.47*pow(z,.32);
        surface+=vec3(1.,.76,.36)*pow(filament,3.)*.12;
        float limb=exp(-abs(r-.996)*72.);
        float limbNoise=fbm(vec3(p*16.,t*.14));
        surface+=vec3(1.,.86,.54)*limb*(.20+.25*limbNoise);
        rgb=min(surface,vec3(1.))*disk;alpha=disk;
      }
      if(r>.96){
        vec2 dir=p/max(r,.001);
        float h=max(0.,r-1.);
        float coronaTime=u_time*2.; // Keep the v209 corona cadence.
        float structure=fbm(vec3(dir*8.5,coronaTime*.13));
        float fine=noise3(vec3(dir*37.,coronaTime*.26-h*13.));
        float edge=exp(-h/(.020+.026*structure))*(.40+.36*fine);
        float haze=exp(-h*10.)*.045;
        float arcs=loopArc(p,2.16,.155,.102,1.2)*.66
                  +loopArc(p,-.42,.113,.073,4.4)*.53
                  +loopArc(p,-1.63,.085,.056,8.1)*.32;
        vec3 glow=vec3(1.,.72,.32)*edge+vec3(.92,.13,.005)*haze
                 +vec3(1.,.80,.45)*arcs;
        glow*=1.-disk;
        rgb+=glow;
        alpha=min(1.,alpha+max(glow.r,max(glow.g,glow.b)));
      }
      // Premultiplied output keeps the transparent canvas bounded and black-space safe.
      gl_FragColor=vec4(min(rgb,vec3(1.)),clamp(alpha,0.,1.));
    }
  `;

  class SolarRenderer {
    constructor(host) {
      this.host=host;
      this.canvas=document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden','true');
      this.canvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
      host.appendChild(this.canvas);
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.size=0;this.visible=false;this.last=-Infinity;this.frames=0;
      this.gl=this.canvas.getContext('webgl',{
        alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,
        preserveDrawingBuffer:false,powerPreference:'high-performance'
      });
      if(this.gl){
        try{this.initialize();}catch(error){console.warn('COSMOS solar WebGL fallback',error);this.fallback();}
      }else this.fallback();
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.fallback();});
      this.canvas.addEventListener('webglcontextrestored',()=>{
        try{this.initialize();this.lost=false;this.fallbackCanvas?.remove();this.fallbackCanvas=null;
          this.canvas.style.display='block';this.last=-Infinity;
        }catch(error){console.warn('COSMOS solar context restore',error);}
      });
    }
    initialize(){
      const gl=this.gl;
      const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);return shader;};
      const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);
      gl.bindAttribLocation(program,0,'a_position');gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
        const error=gl.getShaderInfoLog(fs)||gl.getProgramInfoLog(program);
        gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteProgram(program);throw Error(error);
      }
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
      this.program=program;
      this.time=gl.getUniformLocation(program,'u_time');this.pixel=gl.getUniformLocation(program,'u_pixel');
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      const random=new Uint8Array(256*256),pixels=new Uint8Array(256*256*4);
      let seed=2071626;
      for(let i=0;i<random.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;random[i]=seed&255;}
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        const i=(y*256+x)*4;pixels[i]=random[y*256+x];
        pixels[i+1]=random[((y+17)&255)*256+((x+37)&255)];pixels[i+3]=255;
      }
      const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
      gl.uniform1i(gl.getUniformLocation(program,'u_noise'),0);
      gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      this.size=0;this.host.dataset.renderer='webgl-domain-warped-plasma';
      this.host.dataset.ready='true';
    }
    project(spriteSize,visible){this.projectedSize=spriteSize;this.visible=visible;}
    draw(now){
      if(!this.visible||document.visibilityState!=='visible')return;
      if(this.reduced.matches&&this.frames>0)return;
      const t=this.reduced.matches?0:now*.001;
      if(this.fallbackCanvas){if(now-this.last>=66){this.paintFallback(t*4);this.last=now;this.frames++;}return;}
      if(this.lost)return;
      const gl=this.gl;
      // Resize in coarse steps only, retaining near-retina detail on iPhone.
      const cap=innerWidth<700?1024:1536;
      const desired=Math.min(cap,Math.max(256,Math.ceil(this.projectedSize*Math.min(devicePixelRatio||1,2)/64)*64));
      if(!this.size||desired>this.size*1.25||desired<this.size*.65){
        this.size=desired;this.canvas.width=desired;this.canvas.height=desired;gl.viewport(0,0,desired,desired);
        gl.uniform1f(this.pixel,4/desired);
      }
      gl.uniform1f(this.time,t);gl.drawArrays(gl.TRIANGLES,0,3);this.frames++;
    }
    fallback(){
      if(this.fallbackCanvas)return;
      this.frames=0;
      this.canvas.style.display='none';
      const c=document.createElement('canvas');c.width=c.height=160;
      c.style.cssText=this.canvas.style.cssText;c.style.display='block';this.host.appendChild(c);
      this.fallbackCanvas=c;this.context=c.getContext('2d');
      this.image=this.context.createImageData(160,160);
      this.host.dataset.renderer='canvas2d-procedural-fallback';this.host.dataset.ready='true';
    }
    paintFallback(t){
      const p=this.image.data;
      for(let y=0;y<160;y++)for(let x=0;x<160;x++){
        const nx=(x-79.5)/40,ny=(y-79.5)/40,r=Math.hypot(nx,ny),i=(y*160+x)*4;
        if(r>1.6){p[i+3]=0;continue;}
        if(r<=1){
          const z=Math.sqrt(1-r*r),u=Math.atan2(nx,z)+t*.035;
          const w=Math.sin(u*7+Math.sin(ny*9+t*.15)*1.7+t*.17);
          const f=Math.sin(u*19+ny*15+w*2+t*.24)*Math.sin(ny*23-u*11-w-t*.18);
          const heat=Math.max(0,Math.min(1,.40+.30*f+.16*w));
          p[i]=90+165*Math.min(1,heat*1.7);p[i+1]=8+240*heat;p[i+2]=2+220*heat**2;p[i+3]=255;
        }else{const a=Math.exp(-(r-1)*28)*190;p[i]=255;p[i+1]=184;p[i+2]=82;p[i+3]=a;}
      }
      this.context.putImageData(this.image,0,0);
    }
  }
  window.CosmosSolarRenderer=SolarRenderer;
})();
