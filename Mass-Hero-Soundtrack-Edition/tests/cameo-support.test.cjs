const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CameoSupport,ROSTER,DURATION}=require('../cameo-support.js');
const mob=(id,x=320,y=420,hp=100)=>({id,type:'grunt',x,y,hp,dead:false,stun:0});
function fixture(id='narasimha',enemies=[mob(1)]){
 const hits=[],events=[];
 const support=new CameoSupport({dealDamage:(e,amount)=>{hits.push({id:e.id,amount});e.hp-=amount;if(e.hp<=0)e.dead=true;},emit:e=>events.push(e)});
 const context={mode:'playing',phase:'wave',transition:false,enemies,player:{x:280,y:420,face:1},width:960,height:540};
 if(id)support.select(id);
 return {support,context,hits,events};
}
test('selection is required, exclusive, validated and locked during an assist',()=>{
 const {support,context}=fixture(null);assert.equal(support.summon(context),false);assert.equal(support.select('unknown'),false);
 support.select('mathew');support.select('pragi');assert.equal(support.selected,'pragi');assert(support.summon(context));assert.equal(support.select('hrithik'),false);
});
test('illegal calls do not consume a charge',()=>{
 const {support,context}=fixture();
 for(const patch of [{mode:'paused'},{mode:'selecting'},{phase:'boss'},{transition:true},{enemies:[]}]){assert.equal(support.summon({...context,...patch}),false);assert.equal(support.used,false);}
 assert.equal(support.summon({...context,enemies:[mob(1),{...mob(2),type:'boss'}]}),false);
});
test('summons last exactly ten active-play seconds including fractional updates',()=>{
 const {support,context,events}=fixture();assert.equal(DURATION,10);support.summon(context);
 support.update(9.999,context);assert(support.active);support.update(.001,context);assert.equal(support.active,null);assert.equal(events.filter(e=>e.kind==='expired').length,1);
 support.resetWave(2);context.enemies=[mob(2)];support.summon(context);for(let i=0;i<100;i++)support.update(.1,context);assert.equal(support.active,null);
});
test('pause freezes duration, one call is allowed per wave, new waves recharge',()=>{
 const {support,context}=fixture();support.summon(context);support.update(3,context);support.update(50,{...context,mode:'paused'});assert.equal(support.active.elapsed,3);
 support.update(7,context);context.enemies=[mob(2)];assert.equal(support.summon(context),false);support.resetWave(2);assert.equal(support.selected,'narasimha');assert(support.summon(context));
});
for(const id of ROSTER.map(r=>r.id)){
 test(id+' never damages a boss, even in a mixed enemy list',()=>{
  const {support,context,hits}=fixture(id,[mob(1,300,420,1000)]);support.summon(context);
  const boss={...mob(99,300,420,5000),type:'boss'},tagged={...mob(98,300,420,5000),isBoss:true};context.enemies.push(boss,tagged);
  for(let i=0;i<100;i++)support.update(.1,context);
  assert.equal(boss.hp,5000);assert.equal(tagged.hp,5000);assert(hits.every(h=>h.id!==99&&h.id!==98));
 });
 test(id+' stops applying attacks if the phase becomes a boss fight',()=>{
  const {support,context,hits}=fixture(id);support.summon(context);support.update(5,{...context,phase:'boss'});assert.equal(hits.length,0);support.update(5,{...context,phase:'boss'});assert.equal(support.active,null);
 });
}
test('sniper instantly kills the selected normal enemy and fires from off-screen',()=>{
 const {support,context,hits}=fixture('narasimha',[mob(1),mob(2,400,420,999)]);support.cycleTarget(context);support.cycleTarget(context);assert.equal(support.targetId,2);
 support.summon(context);support.update(.6,context);assert.deepEqual(hits,[{id:2,amount:999}]);assert.equal(context.enemies[0].hp,100);assert(support.active.effects[0].fromX<0);
});
test('Mathew swept vehicle collision damages multiple normal enemies only in its lane',()=>{
 const {support,context,hits}=fixture('mathew',[mob(1,200),mob(2,400),mob(3,350,700)]);support.summon(context);support.update(1,context);
 assert.deepEqual(hits.map(h=>h.id),[1,2]);assert.equal(context.enemies[2].hp,100);
});
test('Hrithik summons exactly three pursuing combat companions with group attacks',()=>{
 const {support,context,hits}=fixture('hrithik',[mob(1,290,420,2000),mob(2,315,420,2000)]);support.summon(context);assert.equal(support.active.agents.length,3);support.update(.1,context);
 assert(hits.some(h=>h.id===1));assert(hits.some(h=>h.id===2));assert(support.active.agents.every(a=>a.attacking>0));
});
test('Pragi shocks and stuns nearby mobs while leaving distant enemies untouched',()=>{
 const {support,context,hits}=fixture('pragi',[mob(1,300,420,500),mob(2,900,420,500)]);support.summon(context);support.update(.25,context);
 assert.deepEqual(hits,[{id:1,amount:85}]);assert.equal(context.enemies[0].stun,1.4);assert.equal(context.enemies[1].hp,500);
});
test('expired and stopped helpers cannot keep dealing damage',()=>{
 const {support,context,hits}=fixture('pragi',[mob(1,300,420,5000)]);support.summon(context);support.update(10,context);const count=hits.length;support.update(10,context);assert.equal(hits.length,count);assert.equal(support.damage(context.enemies[0],10,context),false);support.resetWave(2);support.summon(context);support.stop();support.update(10,context);assert.equal(hits.length,count);
});
