const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/cosmos-worlds-v212.js'),'utf8'),sandbox);
const model=sandbox.window.CosmosOrbitModel,base=[1.3,.12,1.4],norm=v=>Math.hypot(...v),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const [i,o]of model.orbits.entries()){
 assert(Math.abs(norm(o.u)-1)<1e-12);assert(Math.abs(norm(o.v)-1)<1e-12);assert(Math.abs(dot(o.u,o.v))<1e-12);
 if(i)assert(o.a*(1-o.e)>model.orbits[i-1].a*(1+model.orbits[i-1].e),'tracks must be nested without crossing');
 const focus2=base.map((v,k)=>v-2*o.a*o.e*o.u[k]),normal=cross(o.u,o.v),period=Math.PI*2/o.speed,momenta=[];
 for(let j=0;j<32;j++){
  const t=j/32*period,p=model.position(o.slot,t,base),r=p.map((v,k)=>v-base[k]);
  assert(Math.abs(norm(r)+norm(p.map((v,k)=>v-focus2[k]))-2*o.a)<1e-10,'the Sun must be one focus');
  assert(Math.abs(dot(r,normal))<1e-10,'the orbit must remain planar');
  const a=model.position(o.slot,t-1,base),b=model.position(o.slot,t+1,base),velocity=b.map((v,k)=>(v-a[k])/2);
  momenta.push(norm(cross(r,velocity)));
 }
 assert((Math.max(...momenta)-Math.min(...momenta))/momenta[0]<1e-7,'equal areas must be swept in equal times');
 const closed=model.position(o.slot,period,base),start=model.position(o.slot,0,base);
 assert(norm(start.map((v,k)=>v-closed[k]))<1e-10,'each period must close');
}
assert(model.orbits.every((o,i,a)=>!i||o.speed<a[i-1].speed),'outer bodies must move more slowly');
console.log('PASS 3 nested Kepler orbits: shared focus, planes, closed periods and equal swept areas');
