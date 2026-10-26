/* Physical invariants of the accelerated binary and captured-wind paths. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const context={window:{}};vm.createContext(context);
for(const file of ['cosmos-exotics-v221.js','cosmos-cygnus-v222.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),context);
const norm=a=>Math.hypot(...a),distance=(a,b)=>norm(a.map((v,i)=>v-b[i]));
for(const [name,model]of [['Spica',context.window.CosmosExoticScenes],['Cygnus X-1',context.window.CosmosCygnus]]){
 const sample=model.binaryOrbit||model.orbit,initial=sample(0),later=sample(model.period*.25);
 assert(distance(initial.a,later.a)>.5&&distance(initial.b,later.b)>.5,'both bodies must move');
 for(let i=0;i<=256;i++){
  const time=i*model.period/128,{a,b,axis}=sample(time),closed=sample(time+model.period);
  assert(distance(a,closed.a)<1e-11&&distance(b,closed.b)<1e-11,'the mutual orbit must close');
  for(let j=0;j<3;j++)assert(Math.abs(a[j]*model.primaryMass+b[j]*model.secondaryMass)<1e-11,'centre of mass must remain fixed');
  assert(Math.abs(norm(axis)-1)<1e-12);
  assert(distance(a,b)>(name==='Spica'?.82:2.),'stellar photospheres and disk must not collide');
  if(model.gasPoint){
   const start=model.gasPoint(0,time),end=model.gasPoint(1,time);
   assert(distance(start,a)>1.02&&distance(start,a)<1.10,'wind must leave the donor surface');
   assert(distance(end,b)>.115&&distance(end,b)<.72,'wind must join the inner disk outside the horizon');
   let previous=Infinity;
   for(let k=0;k<=32;k++){
    const d=distance(model.gasPoint(k/32,time),b);assert(d<=previous+1e-10,'gas must approach the black hole');previous=d;
   }
   const mid=model.gasPoint(.5,time),straight=start.map((v,j)=>(v+end[j])*.5);
   assert(distance(mid,straight)>.15,'the wind must bend into the disk');
  }
 }
 console.log('PASS',name,'closed mutual orbit, fixed barycentre, separated bodies'+(model.gasPoint?', attached curved capture flow':''));
}
