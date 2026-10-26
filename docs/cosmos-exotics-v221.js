/* COSMOS v221 — a barycentric blue binary and a three-dimensional quasar.
 * Shader programs share the existing deep-scene WebGL context and noise texture.
 * Spica's real 4.01-day orbit is accelerated for this artistic tour.
 * Sources: https://www.cfa.harvard.edu/news/understanding-spica
 * https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-are-active-galactic-nuclei/
 */
(()=>{
 'use strict';
 const TAU=Math.PI*2,period=6.4,primaryMass=11.4,secondaryMass=7.2;
 function binaryOrbit(seconds){
  const mean=seconds*TAU/period+.55,e=.067;let anomaly=mean;
  for(let i=0;i<5;i++)anomaly-=(anomaly-e*Math.sin(anomaly)-mean)/(1-e*Math.cos(anomaly));
  const x=1.52*(Math.cos(anomaly)-e),z=1.52*Math.sqrt(1-e*e)*Math.sin(anomaly);
  const separation=[x,z*.26,z*Math.sqrt(1-.26*.26)],total=primaryMass+secondaryMass;
  return {a:separation.map(v=>-v*secondaryMass/total),b:separation.map(v=>v*primaryMass/total),
   axis:separation.map(v=>v/Math.hypot(...separation))};
 }
 function stellarSource(){return `
   uniform vec3 u_star_a,u_star_b,u_star_axis;
   float stellarHit(vec3 ray,vec3 centre,float radius){
    vec3 e=(u_eye-centre)/radius,d=ray/radius;
    e-=u_star_axis*dot(e,u_star_axis)*.065;d-=u_star_axis*dot(d,u_star_axis)*.065;
    float a=dot(d,d),b=dot(e,d),c=dot(e,e)-1.,q=b*b-a*c;
    if(q<0.)return -1.;float t=(-b-sqrt(q))/a;return t>.02?t:-1.;
   }
   vec3 photosphere(vec3 ray,vec3 centre,float radius,float distance,float phase){
    vec3 p=(u_eye+ray*distance-centre)/radius;
    vec3 n=normalize(p-u_star_axis*dot(p,u_star_axis)*.126);
    float mu=max(0.,dot(n,-ray));
    vec3 flow=n*5.8+vec3(u_time*.085,phase,-u_time*.065);
    float warp=fbm(flow*.95),gas=fbm(flow*1.9+warp*2.2);
    float filaments=pow(1.-abs(gas*2.-1.),4.);
    float cells=noise3(flow*23.+warp*3.);
    float heat=clamp(.25+.51*gas+.24*filaments+.08*cells,0.,1.);
    vec3 color=mix(vec3(.44,.66,.91),vec3(.97,.985,1.),smoothstep(.22,.88,heat));
    color+=vec3(.025,.035,.05)*filaments*filaments;
    color*=.54+.46*pow(mu,.34);
    color+=vec3(.05,.31,.67)*pow(1.-mu,5.)*.28;
    return color*(.98+.02*sin(u_time*3.2+phase));
   }
   vec3 atmosphere(vec3 ray,vec3 centre,float radius){
    vec3 offset=centre-u_eye;float along=dot(offset,ray);
    if(along<=0.)return vec3(0.);
    float distance=length(offset-ray*along)/radius;
    float h=max(0.,distance-1.);
    return vec3(.035,.18,.58)*(exp(-h*7.)*.65+exp(-h*2.1)*.16+exp(-h*.8)*.035);
   }
`; }
 function shaders(projection,noise){
  const spica=`precision highp float;${projection}${noise}
   ${stellarSource()}
   void main(){
    vec3 ray=viewRay();float a=stellarHit(ray,u_star_a,.44),b=stellarHit(ray,u_star_b,.33);
    vec3 halo=atmosphere(ray,u_star_a,.44)+atmosphere(ray,u_star_b,.33);
    float alpha=max(halo.r,max(halo.g,halo.b));vec3 light=halo;
    if(a>0.&&(b<0.||a<b)){light=photosphere(ray,u_star_a,.44,a,0.)+halo*.10;alpha=1.;}
    else if(b>0.){light=photosphere(ray,u_star_b,.33,b,3.7)+halo*.10;alpha=1.;}
    gl_FragColor=vec4(min(light,vec3(1.))*u_alpha,clamp(alpha,0.,1.)*u_alpha);
   }`;
  const quasar=`precision highp float;${projection}${noise}
   vec2 ellipsoid(vec3 ray,vec3 eye,vec3 scale){
    vec3 e=eye*scale,d=ray*scale;float a=dot(d,d),b=dot(e,d),c=dot(e,e)-1.,q=b*b-a*c;
    if(q<=0.)return vec2(0.);return vec2(max(.02,(-b-sqrt(q))/a),(-b+sqrt(q))/a);
   }
   void main(){
    vec3 worldRay=viewRay();vec2 shadow=intersectSphere(worldRay,.265);float horizon=shadow.y>shadow.x?shadow.x:1.e5;
    mat3 tilt=mat3(.9396926,-.3420201,0.,.3420201,.9396926,0.,0.,0.,1.);
    vec3 ray=tilt*worldRay,eye=tilt*u_eye;
    vec3 light=vec3(0.);float opacity=0.;
    vec2 range=ellipsoid(ray,eye,vec3(1./3.2,1./.36,1./3.2));
    if(range.y>range.x){
     float stepSize=(range.y-range.x)/6.;
     for(int i=0;i<6;i++){
      float along=range.x+(float(i)+.5)*stepSize;
      vec3 p=eye+ray*along;float r=length(p.xz),angle=atan(p.z,p.x);
      // Two steady flow fields shear past each other without accumulating
      // ever finer frequencies as the looping tour runs for hours.
      float slow=angle-u_time*.62+log(.3+r)*1.7,fast=angle-u_time*1.75+log(.3+r)*1.7;
      float inner=1.-smoothstep(.6,2.4,r);
      vec3 flow=vec3(cos(slow)*r,p.y*4.,sin(slow)*r);
      vec3 fastFlow=vec3(cos(fast)*r,p.y*4.,sin(fast)*r);
      float coarse=mix(fbm(flow*1.65+vec3(0.,u_time*.045,0.)),fbm(fastFlow*1.65+vec3(0.,u_time*.07,0.)),inner);
      float warp=fbm(flow*3.3+coarse*2.1);
      float clumps=fbm(flow*5.2+warp*2.8);
      float threads=mix(noise3(vec3(r*36.+warp*3.,cos(slow)*4.,sin(slow)*4.)),noise3(vec3(r*36.+warp*3.,cos(fast)*4.,sin(fast)*4.)),inner);
      float filaments=pow(1.-abs(threads*2.-1.),4.);
      float height=.045+.060*r;
      float edge=r+(coarse-.5)*.72;
      float envelope=exp(-p.y*p.y/(height*height))*smoothstep(.28,.42,r)*(1.-smoothstep(2.25,3.1,edge));
      float clouds=pow(smoothstep(.27,.70,clumps),1.7);
      float density=envelope*clouds*(.15+filaments*1.6)*step(.02,along)*step(along,horizon);
      vec3 color=mix(vec3(.20,.008,.022),vec3(1.,.24,.025),smoothstep(.20,.67,clumps));
      color=mix(color,vec3(.15,.28,.60),smoothstep(.43,.68,coarse)*smoothstep(1.65,2.7,r)*.65);
      color=mix(color,vec3(1.,.77,.35),exp(-r*.87)*1.20);
      color=mix(color,vec3(.78,.93,1.),1.-smoothstep(.55,1.65,r));
      float brilliance=(1.1+5.1*exp(-r*1.05))*(.50+filaments);
      float absorb=1.-exp(-density*stepSize*15.);
      light+=color*brilliance*absorb*(1.-opacity);opacity+=absorb*(1.-opacity);
     }
    }
    // Analytic closest approach resolves a very thin jet without coarse volume slices.
    float transverse=max(.015,dot(ray.xz,ray.xz));
    float at=-dot(eye.xz,ray.xz)/transverse;
    vec3 closest=eye+ray*at;float height=abs(closest.y);
    if(at>.02&&height<5.35){
     float width=.038+.052*height;
     float stride=width/sqrt(transverse)*.65;vec3 beam=vec3(0.);
     for(int j=0;j<3;j++){
      float along=at+(float(j)-1.)*stride;vec3 p=eye+ray*along;
      float y=abs(p.y),side=p.y<0.?-1.:1.;
      float twist=y*10.-u_time*5.2;
      vec2 centre=vec2(sin(twist),cos(twist*.93))*width*.055;
      float radius=length(p.xz-centre)/width;
      float core=exp(-radius*radius*7.),sheath=exp(-radius*radius*1.5);
      float strands=noise3(vec3(p.x/width*3.,p.z/width*3.,y*5.-u_time*6.2));
      float packets=.50+.50*noise3(vec3(y*4.-u_time*5.8,side*7.2,u_time*.11));
      float braid=.92+.08*sin(twist+atan(p.z,p.x)*2.);
      float fade=smoothstep(.29,.52,y)*(1.-smoothstep(4.2,5.3,y));
      float beaming=eye.y*p.y>0.?1.:.52;
      beam+=(vec3(.78,.94,1.)*core*(2.8+strands*strands*3.5)+vec3(.07,.38,1.)*sheath*(.5+strands*1.2))*
       fade*(.75+packets*.75)*braid*beaming*step(along,horizon)/3.;
     }
     light+=beam;
    }
    // The horizon stays black; only foreground emission can cross its silhouette.
    float black=shadow.y>shadow.x?1.:0.;
    vec3 rgb=(1.-exp(-light*1.25))*u_alpha;
    float alpha=max(max(rgb.r,max(rgb.g,rgb.b)),opacity*u_alpha);
    gl_FragColor=vec4(rgb,max(alpha,black*u_alpha));
   }`;
  return {spica,quasar};
 }
 window.CosmosExoticScenes={binaryOrbit,period,primaryMass,secondaryMass,stellarSource,shaders};
})();
