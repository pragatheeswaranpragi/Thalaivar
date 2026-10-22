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
test('one sniper shot kills the selected enemy plus its two nearest normal allies',()=>{
 const {support,context,hits,events}=fixture('narasimha',[mob(1),mob(2,400,420,999),mob(3,500),mob(4,850)]);
 support.cycleTarget(context);support.cycleTarget(context);assert.equal(support.targetId,2);
 support.summon(context);support.update(.6,context);
 assert.deepEqual(hits,[{id:2,amount:999},{id:1,amount:100},{id:3,amount:100}]);assert.equal(context.enemies[3].hp,100);
 assert(support.active.effects[0].fromX<0);assert.equal(events.filter(e=>e.kind==='sniper').length,3);
 support.update(1.25,context);assert.equal(context.enemies[3].dead,true);
});
test('sniper safely fires when fewer than three normal enemies remain',()=>{
 for(const count of [1,2]){
  const {support,context,hits}=fixture('narasimha',Array.from({length:count},(_,i)=>mob(i+1,320+i*40)));
  support.summon(context);support.update(.6,context);assert.equal(hits.length,count);assert(context.enemies.every(e=>e.dead));
 }
});
test('Mathew swept vehicle collision damages multiple normal enemies only in its lane',()=>{
 const {support,context,hits}=fixture('mathew',[mob(1,200),mob(2,400),mob(3,350,700)]);support.summon(context);support.update(1,context);
 assert.deepEqual(hits.map(h=>h.id),[1,2]);assert.equal(context.enemies[2].hp,100);
});
test('Hrithik fires rifle bursts while exactly three companions close into melee',()=>{
 const {support,context,hits,events}=fixture('hrithik',[mob(1,450,420,2000),mob(2,470,420,2000)]);support.summon(context);
 assert.equal(support.active.agents.length,3);const start=support.active.agents[0].x;
 for(let i=0;i<40;i++)support.update(.025,context);
 assert(support.active.agents[0].x>start);assert(hits.some(h=>h.amount===24));assert(hits.some(h=>h.amount===26));assert(events.some(e=>e.kind==='rifle'));assert(events.some(e=>e.kind==='melee'));
});
test('Pragi pursues distant enemies and only lands grounded strikes inside melee range',()=>{
 const {support,context,hits,events}=fixture('pragi',[mob(1,850,420,5000)]);support.summon(context);
 support.update(.25,context);assert.equal(hits.length,0);assert(support.active.fighter.x>315);
 for(let i=0;i<160;i++)support.update(.025,context);
 assert(hits.length>=3);assert(hits.some(h=>h.amount===48*1.45));assert(events.some(e=>e.kind==='melee'));assert(!events.some(e=>['shock','lightning'].includes(e.kind)));
 assert(support.active.effects.every(e=>!['shock','lightning'].includes(e.kind)));
});
test('Pragi windup allows an enemy to dodge before contact',()=>{
 const {support,context,hits}=fixture('pragi',[mob(1,350,420,500)]);support.summon(context);support.update(.05,context);
 assert(support.active.fighter.attacking>0);context.enemies[0].x=900;support.update(.2,context);assert.equal(hits.length,0);
});
test('expired and stopped helpers cannot keep dealing damage',()=>{
 const {support,context,hits}=fixture('pragi',[mob(1,300,420,5000)]);support.summon(context);support.update(10,context);const count=hits.length;support.update(10,context);assert.equal(hits.length,count);assert.equal(support.damage(context.enemies[0],10,context),false);support.resetWave(2);support.summon(context);support.stop();support.update(10,context);assert.equal(hits.length,count);
});
test('Swetha heals thirty health and drains exactly five HP per second',()=>{
 const {support,context,hits,events}=fixture('swetha',[mob(1,320,420,1000),mob(2,800,420,1000)]);context.player.hp=50;
 support.summon(context);support.update(.5,context);assert.equal(context.player.hp,53);assert.equal(hits.length,0);
 support.update(.5,context);assert.equal(context.enemies[0].hp,995);assert.equal(context.enemies[1].hp,1000);
 support.update(9,context);assert.equal(context.player.hp,80);assert.equal(support.active,null);assert.equal(context.enemies[0].hp,950);assert.equal(events.filter(e=>e.kind==='care').length,10);
});
test('Swetha caps health, follows smoothly, and pause freezes healing and drain',()=>{
 const {support,context}=fixture('swetha');context.player.hp=99;support.summon(context);const x=support.active.helper.x;context.player.x=600;support.update(.25,context);
 assert(support.active.helper.x>x);assert(support.active.helper.x<520);assert(support.active.helper.moving);
 support.update(5,{...context,mode:'paused'});assert.equal(context.player.hp,99);assert.equal(support.active.elapsed,.25);
 support.update(.25,context);assert.equal(context.player.hp,100);support.update(9.5,context);assert.equal(context.player.hp,100);
});
test('Swetha circle repels overlapping mobs and blocks their attacks',()=>{
 const {support,context}=fixture('swetha',[mob(1,280,420),mob(2,290,425)]);support.summon(context);support.enforceBarrier(context);
 for(const e of context.enemies){assert(Math.hypot(e.x-context.player.x,(e.y-context.player.y)*1.6)>=149.99);assert(support.blocksEnemy(e,context));assert.equal(e.windup,0);}
 context.player.x=600;support.enforceBarrier(context);for(const e of context.enemies)assert(Math.hypot(e.x-600,(e.y-420)*1.6)>=149.99);
});
test('Swetha barrier stays valid at all arena corners',()=>{
 for(const x of [30,930])for(const y of [327,510]){
  const {support,context}=fixture('swetha',[mob(1,x,y)]);context.player.x=x;context.player.y=y;support.summon(context);support.enforceBarrier(context);
  const enemy=context.enemies[0];assert(enemy.x>=30&&enemy.x<=930);assert(enemy.y>=326&&enemy.y<=510);assert(Math.hypot(enemy.x-x,(enemy.y-y)*1.6)>=149.99);
 }
});
test('Swetha protection excludes bosses, transitions, pause and expired summons',()=>{
 const {support,context}=fixture('swetha');assert.equal(support.hasProtection(context),false);support.summon(context);assert(support.hasProtection(context));
 const boss={...mob(99),type:'boss'};assert.equal(support.blocksEnemy(boss,context),false);
 for(const patch of [{phase:'boss'},{transition:true},{mode:'paused'},{enemies:[boss]}])assert.equal(support.hasProtection({...context,...patch}),false);
 support.update(10,context);assert.equal(support.hasProtection(context),false);
});
