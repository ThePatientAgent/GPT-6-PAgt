/* COSMOS v222 — wind-fed Cygnus X-1: one moving binary, stream and disk.
 * The 5.6-day orbit is accelerated; dimensions and luminosity are artistic.
 * Wind accretion: https://doi.org/10.1051/0004-6361/202037561
 * Mass estimates: https://doi.org/10.1093/pasj/psag039
 * Shares the deep renderer's context, texture and animation clock.
 */
(()=>{
 'use strict';
 const period=7.6,primaryMass=40.6,secondaryMass=21.2,tilt=.18;
 const normal=[0,Math.sqrt(1-tilt*tilt),-tilt];
 const add=(a,b,s=1)=>a.map((v,i)=>v+b[i]*s);
 function orbit(seconds){
  const phase=seconds*Math.PI*2/period+.35;
  const axis=[Math.cos(phase),Math.sin(phase)*tilt,Math.sin(phase)*normal[1]];
  const total=primaryMass+secondaryMass;
  const a=axis.map(v=>-v*3.1*secondaryMass/total),b=axis.map(v=>v*3.1*primaryMass/total);
  const tangent=[normal[1]*axis[2]-normal[2]*axis[1],normal[2]*axis[0],-normal[1]*axis[0]];
  const p0=add(a,axis,1.085),p1=add(add(p0,axis,.65),tangent,-.10);
  const p2=add(add(b,axis,-.80),tangent,-.80),p3=add(add(b,axis,-.34),tangent,-.35);
  return {a,b,axis,tangent,control:[p0,p1,p2,p3]};
 }
 function gasPoint(u,seconds){
  const p=orbit(seconds).control,v=1-u;
  return p[0].map((_,i)=>v*v*v*p[0][i]+3*v*v*u*p[1][i]+3*v*u*u*p[2][i]+u*u*u*p[3][i]);
 }
 function shaders(projection,noise){
  return {cygnus:`precision highp float;${projection}${noise}
   ${window.CosmosExoticScenes.stellarSource()}
   vec2 volume(vec3 ray,vec3 eye,vec3 scale){
    vec3 e=eye*scale,d=ray*scale;float a=dot(d,d),b=dot(e,d),c=dot(e,e)-1.,q=b*b-a*c;
    if(q<=0.)return vec2(0.);return vec2(max(.02,(-b-sqrt(q))/a),(-b+sqrt(q))/a);
   }
   vec3 gasCurve(float u,vec3 p0,vec3 p1,vec3 p2,vec3 p3){
    float v=1.-u;return v*v*v*p0+3.*v*v*u*p1+3.*v*u*u*p2+u*u*u*p3;
   }
   void main(){
    vec3 ray=viewRay(),axis=u_star_axis,normal=vec3(0.,.98366661,-.18);
    vec3 tangent=normalize(cross(normal,axis));
    float star=stellarHit(ray,u_star_a,1.02);
    vec3 relative=u_eye-u_star_b;
    vec2 hole=volume(ray,relative,vec3(1./.115));
    float horizon=hole.y>hole.x?hole.x:1.e5;
    float cutoff=min(star>.02?star:1.e5,horizon);
    vec3 halo=atmosphere(ray,u_star_a,1.02);
    vec3 body=star>.02&&star<horizon?photosphere(ray,u_star_a,1.02,star,1.8)+halo*.06:halo*.45;
    float bodyAlpha=star>.02||horizon<1.e4?1.:max(halo.r,max(halo.g,halo.b))*.45;
    if(horizon<cutoff+.001&&horizon<1.e4)body=vec3(0.);
    vec3 localEye=vec3(dot(relative,axis),dot(relative,normal),dot(relative,tangent));
    vec3 localRay=vec3(dot(ray,axis),dot(ray,normal),dot(ray,tangent));
    vec2 range=volume(localRay,localEye,vec3(1./.97,1./.17,1./.97));
    vec3 disk=vec3(0.);float diskAlpha=0.;
    if(range.y>range.x){
     float stride=(range.y-range.x)/6.;
     for(int i=0;i<6;i++){
      float along=range.x+(float(i)+.5)*stride;
      vec3 p=localEye+localRay*along;float r=length(p.xz),a=atan(p.z,p.x);
      float slow=a-u_time*.95+log(.12+r)*1.6,fast=a-u_time*4.+log(.12+r)*1.6;
      float inner=1.-smoothstep(.2,.7,r);
      vec3 flow=vec3(cos(slow)*r,p.y*5.,sin(slow)*r),fastFlow=vec3(cos(fast)*r,p.y*5.,sin(fast)*r);
      float warp=mix(fbm(flow*5.2),fbm(fastFlow*5.2),inner);
      float cloud=fbm(flow*6.+warp*2.1+vec3(0.,u_time*.13,0.));
      float bands=mix(noise3(vec3(r*24.+warp*2.,cos(slow)*4.,sin(slow)*4.)),noise3(vec3(r*24.+warp*2.,cos(fast)*4.,sin(fast)*4.)),inner);
      float threads=pow(1.-abs(2.*bands-1.),4.);
      float height=.022+.057*r;
      float edge=r+(warp-.5)*.23;
      float envelope=exp(-p.y*p.y/(height*height))*smoothstep(.115,.175,r)*(1.-smoothstep(.72,.94,edge));
      float density=envelope*(.12+threads*2.2)*pow(smoothstep(.29,.76,cloud),2.)*step(along,cutoff);
      float hot=1.-smoothstep(.19,.62,r);
      vec3 color=mix(vec3(.27,.004,.001),vec3(1.,.24,.012),cloud);
      color=mix(color,vec3(1.,.94,.68),hot);
      float impact=exp(-dot(p.xz-vec2(-.34,-.35),p.xz-vec2(-.34,-.35))*48.);
      float brilliance=1.8+hot*4.8+impact*(2.+sin(u_time*8.)*.35);
      float absorb=1.-exp(-density*stride*40.);
      disk+=color*brilliance*absorb*(1.-diskAlpha);diskAlpha+=absorb*(1.-diskAlpha);
     }
    }
    // A focused stellar wind follows the rotating binary; knots travel to the disk.
    vec3 p0=u_star_a+axis*1.085,p1=p0+axis*.65-tangent*.10;
    vec3 p2=u_star_b-axis*.80-tangent*.80,p3=u_star_b-axis*.34-tangent*.35;
    vec3 gas=vec3(0.);float gasAlpha=0.;
    vec2 bounds=volume(ray,u_eye-(u_star_a+u_star_b)*.5,vec3(1./2.2));
    if(bounds.y>bounds.x){
     float best=1.e5,parameter=0.,depth=0.;vec3 offset=vec3(0.);
     vec3 from=p0;
     for(int j=0;j<12;j++){
      float end=(float(j)+1.)/12.;vec3 to=gasCurve(end,p0,p1,p2,p3),segment=to-from,w=u_eye-from;
      float b=dot(ray,segment),c=dot(segment,segment);
      float s=clamp((dot(segment,w)-b*dot(ray,w))/max(.00001,c-b*b),0.,1.);
      float along=dot(from+segment*s-u_eye,ray),u=(float(j)+s)/12.;
      float width=mix(.23,.05,u);vec3 delta=u_eye+ray*along-from-segment*s;
      float distance=dot(delta,delta)/(width*width);
      if(along>.02&&along<cutoff&&distance<best){best=distance;parameter=u;depth=along;offset=delta/width;}
      from=to;
     }
     if(best<16.){
      float u=parameter;
      float travelling=noise3(vec3(u*17.-u_time*5.8,dot(offset,normal)*3.,dot(offset,tangent)*3.));
      float filaments=noise3(vec3(u*31.-u_time*8.1,dot(offset,normal)*6.,dot(offset,tangent)*6.));
      float core=exp(-best*3.2),sheath=exp(-best*.9);
      float structure=(.28+.72*travelling)*(.4+.6*filaments);
      float density=(core*1.35+sheath*.46)*structure+exp(-best*.38)*.055*(1.-u);
      vec3 color=mix(vec3(.48,.77,1.),vec3(1.,.63,.19),smoothstep(.65,1.,u));
      gas=color*density*1.7;gasAlpha=clamp(density*.52,0.,.8);
     }
    }
    vec3 light=(1.-exp(-disk))+body*(1.-diskAlpha);
    // Only the foreground wind softens the star; the background stays pitch black.
    light=gas+light*(1.-gasAlpha*.35);
    vec3 rgb=min(vec3(1.),light)*u_alpha;
    float alpha=max(max(rgb.r,max(rgb.g,rgb.b)),max(bodyAlpha,diskAlpha)*u_alpha);
    gl_FragColor=vec4(rgb,clamp(alpha,0.,1.));
   }`};
 }
 window.CosmosCygnus={orbit,gasPoint,period,primaryMass,secondaryMass,shaders};
})();
