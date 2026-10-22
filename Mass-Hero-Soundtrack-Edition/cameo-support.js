/* Wave-only cameo rules and combat state. Rendering lives in the game. */
(function(root){
  "use strict";
  const DURATION=10;
  const ROSTER=[
    {id:"narasimha",name:"Narasimha",ability:"Sniper Support",description:"Lock a target. Off-screen sniper rounds instantly eliminate normal enemies.",color:"#b8e39a",frame:0},
    {id:"mathew",name:"Mathew",ability:"Vehicular Impact",description:"A heavy SUV sweeps the street, crushing enemy groups in its path.",color:"#ffb183",frame:1},
    {id:"hrithik",name:"Hrithik",ability:"Avatar Assault",description:"Three female combat companions pursue, punch, kick and fire on nearby enemies.",color:"#d5adff",frame:2},
    {id:"pragi",name:"Pragi",ability:"Sonic Lightning",description:"Broad lightning shockwaves damage and stun surrounding normal enemies.",color:"#89eaff",frame:3}
  ];
  const isMob=e=>!!e&&!e.dead&&["grunt","heavy","minion"].includes(e.type)&&!e.isBoss;
  class CameoSupport{
    constructor({dealDamage=()=>{},emit=()=>{}}={}){this.dealDamage=dealDamage;this.emit=emit;this.selected=null;this.active=null;this.used=false;this.targetId=null;this.waveToken=null;}
    select(id){if(!ROSTER.some(r=>r.id===id)||this.active)return false;this.selected=id;return true;}
    resetWave(token){this.active=null;this.used=false;this.targetId=null;this.waveToken=token;}
    stop(){this.active=null;this.targetId=null;}
    canSummon(c){return !!this.selected&&!this.active&&!this.used&&c.mode==="playing"&&c.phase==="wave"&&!c.transition&&!c.enemies.some(e=>!e.dead&&(e.type==="boss"||e.isBoss))&&c.enemies.some(isMob);}
    targets(c){return c.enemies.filter(isMob);}
    target(c){const mobs=this.targets(c);return mobs.find(e=>e.id===this.targetId)||mobs.sort((a,b)=>Math.hypot(a.x-c.player.x,a.y-c.player.y)-Math.hypot(b.x-c.player.x,b.y-c.player.y))[0]||null;}
    cycleTarget(c){if(c.mode!=="playing"||c.phase!=="wave")return null;const mobs=this.targets(c);if(!mobs.length)return null;const at=mobs.findIndex(e=>e.id===this.targetId);this.targetId=mobs[(at+1)%mobs.length].id;return this.target(c);}
    summon(c){
      if(!this.canSummon(c))return false;
      this.used=true;
      this.active={id:this.selected,elapsed:0,remaining:DURATION,nextPulse:this.selected==="narasimha"?.6:.25,effects:[],target:null,
        car:{x:-210,y:Math.max(350,Math.min(490,c.player.y)),face:1,hits:new Set()},
        agents:Array.from({length:3},(_,i)=>({x:c.player.x-45+i*28,y:c.player.y-24+i*24,face:c.player.face,cooldown:0,attacking:0}))};
      this.emit({kind:"summon",id:this.selected,x:c.player.x,y:c.player.y});return true;
    }
    damage(e,amount,c){if(!this.active||c.phase!=="wave"||c.mode!=="playing"||c.transition||!isMob(e))return false;this.dealDamage(e,amount);return true;}
    update(dt,c){
      const a=this.active;if(!a||c.mode!=="playing"||!Number.isFinite(dt)||dt<=0)return;
      const step=Math.min(dt,DURATION-a.elapsed);let end=Math.min(DURATION,a.elapsed+step);if(DURATION-end<1e-9)end=DURATION;
      for(const effect of a.effects)effect.age+=step;
      a.effects=a.effects.filter(effect=>effect.age<effect.duration);
      if(c.phase==="wave"&&!c.transition){
        if(a.id==="narasimha"){
          a.target=this.target(c);
          while(a.nextPulse<=end&&a.nextPulse<DURATION){
            const e=this.target(c);
            if(e&&this.damage(e,e.hp,c)){
              a.effects.push({kind:"sniper",x:e.x,y:e.y-55,fromX:c.player.face>0?-80:c.width+80,age:0,duration:.22});
              this.emit({kind:"sniper",x:e.x,y:e.y});if(this.targetId===e.id)this.targetId=null;
            }
            a.nextPulse+=1.25;
          }
        }else if(a.id==="mathew"){
          const car=a.car,previous=car.x;car.x+=car.face*640*step;
          const low=Math.min(previous,car.x)-115,high=Math.max(previous,car.x)+115;
          for(const e of this.targets(c))if(!car.hits.has(e.id)&&e.x>=low&&e.x<=high&&Math.abs(e.y-car.y)<82){
            car.hits.add(e.id);if(this.damage(e,160,c))this.emit({kind:"impact",x:e.x,y:e.y});
          }
          if(car.x>c.width+230||car.x< -230){
            car.x=Math.max(-230,Math.min(c.width+230,car.x));car.face*=-1;car.hits.clear();
            const mobs=this.targets(c);car.y=mobs.length?mobs.reduce((sum,e)=>sum+e.y,0)/mobs.length:c.player.y;
          }
        }else if(a.id==="hrithik"){
          a.agents.forEach((agent,i)=>{
            agent.cooldown=Math.max(0,agent.cooldown-step);agent.attacking=Math.max(0,agent.attacking-step);
            const mobs=this.targets(c),target=mobs.length?mobs[i%mobs.length]:null;
            const tx=target?target.x:c.player.x+Math.cos(end*3+i*2)*65,ty=target?target.y:c.player.y+Math.sin(end*3+i*2)*32;
            const dx=tx-agent.x,dy=ty-agent.y,distance=Math.hypot(dx,dy)||1,range=i===1?260:62;
            agent.face=dx>=0?1:-1;
            if(distance>range||!target){const travel=Math.min(distance,520*step);agent.x+=dx/distance*travel;agent.y+=dy/distance*travel;}
            agent.x=Math.max(20,Math.min(c.width-20,agent.x));agent.y=Math.max(330,Math.min(510,agent.y));
            if(target&&distance<=range+15&&agent.cooldown<=0){
              agent.cooldown=i===1?.24:.32;agent.attacking=.18;
              for(const e of this.targets(c))if(e===target||Math.hypot(e.x-target.x,e.y-target.y)<75)this.damage(e,i===1?23:32,c);
              a.effects.push({kind:i===1?"bolt":"slash",fromX:agent.x,fromY:agent.y-60,x:target.x,y:target.y-55,age:0,duration:.18,color:ROSTER[2].color});
            }
          });
        }else if(a.id==="pragi"){
          while(a.nextPulse<=end&&a.nextPulse<DURATION){
            const pulse={kind:"shock",x:c.player.x,y:c.player.y-35,age:0,duration:.7};a.effects.push(pulse);
            for(const e of this.targets(c))if(Math.hypot(e.x-c.player.x,(e.y-c.player.y)*1.2)<=340){
              if(this.damage(e,85,c)&&!e.dead)e.stun=Math.max(e.stun||0,1.4);
              a.effects.push({kind:"lightning",fromX:c.player.x,fromY:c.player.y-155,x:e.x,y:e.y-50,age:0,duration:.28});
            }
            this.emit({kind:"shock",x:c.player.x,y:c.player.y});a.nextPulse+=1.7;
          }
        }
      }
      a.elapsed=end;a.remaining=Math.max(0,DURATION-end);
      if(end>=DURATION){const id=a.id;this.active=null;this.targetId=null;this.emit({kind:"expired",id});}
    }
  }
  const api={CameoSupport,ROSTER,DURATION,isMob};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.MassHeroCameos=api;
})(globalThis);
