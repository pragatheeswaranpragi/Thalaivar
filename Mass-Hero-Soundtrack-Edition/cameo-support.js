/* Wave-only cameo rules and combat state. Rendering lives in the game. */
(function(root){
  "use strict";
  const DURATION=10;
  const ROSTER=[
    {id:"narasimha",name:"Narasimha",ability:"Sniper Support",description:"Lock a target. Each off-screen sniper shot eliminates up to three normal enemies.",color:"#b8e39a",frame:0},
    {id:"mathew",name:"Mathew",ability:"Vehicular Impact",description:"A heavy SUV sweeps the street, crushing enemy groups in its path.",color:"#ffb183",frame:1},
    {id:"hrithik",name:"Hrithik",ability:"Strike Team",description:"Hrithik lays down rifle bursts while three female fighters rush in with punches and kicks.",color:"#d5adff",frame:2},
    {id:"pragi",name:"Pragathees",ability:"Martial Arts",description:"Pragathees runs into close combat with flowing jabs, crosses, elbows and roundhouse kicks.",color:"#89eaff",frame:3},
    {id:"swetha",name:"Swetha",ability:"Guardian Circle",description:"A golden circle keeps mobs away, drains nearby enemies by 25 HP per second, and restores up to 60 HP over ten seconds.",color:"#ffe0a0",frame:12}
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
      this.active={id:this.selected,elapsed:0,remaining:DURATION,nextDrain:1,nextPulse:this.selected==="narasimha"?.6:this.selected==="swetha"?.5:.25,effects:[],target:null,
        car:{x:-210,y:Math.max(350,Math.min(490,c.player.y)),face:1,hits:new Set()},
        helper:{x:c.player.x-c.player.face*80,y:c.player.y-8,face:c.player.face,moving:false,helpTime:0},
        fighter:this.actor(c.player.x+35,c.player.y,c.player.face),
        gunner:{x:c.player.x-85,y:c.player.y,face:c.player.face,cooldown:0,recoil:0,burst:0},
        agents:Array.from({length:3},(_,i)=>this.actor(c.player.x-45+i*28,c.player.y-24+i*24,c.player.face))};
      this.emit({kind:"summon",id:this.selected,x:c.player.x,y:c.player.y});return true;
    }
    damage(e,amount,c,options){if(!this.active||c.phase!=="wave"||c.mode!=="playing"||c.transition||!isMob(e))return false;this.dealDamage(e,amount,options);return true;}
    hasProtection(c){return this.active?.id==="swetha"&&c.mode==="playing"&&c.phase==="wave"&&!c.transition&&!c.enemies.some(e=>!e.dead&&(e.type==="boss"||e.isBoss));}
    blocksEnemy(e,c){return this.hasProtection(c)&&isMob(e);}
    enforceBarrier(c){
      if(!this.hasProtection(c))return;
      const radius=150;
      for(const e of this.targets(c)){
        const dx=e.x-c.player.x,dy=(e.y-c.player.y)*1.6,distance=Math.hypot(dx,dy);
        if(distance>=radius)continue;
        const angle=distance>.01?Math.atan2(dy,dx):(e.id%2?0:Math.PI);
        let x=c.player.x+Math.cos(angle)*radius,y=c.player.y+Math.sin(angle)*radius/1.6;
        if(x<30||x>c.width-30||y<326||y>510){
          let best=Infinity;
          for(let i=0;i<64;i++){
            const a=i*Math.PI*2/64,tx=c.player.x+Math.cos(a)*radius,ty=c.player.y+Math.sin(a)*radius/1.6;
            if(tx<30||tx>c.width-30||ty<326||ty>510)continue;
            const cost=Math.hypot(tx-e.x,ty-e.y);if(cost<best){best=cost;x=tx;y=ty;}
          }
        }
        e.x=x;e.y=y;e.windup=0;e.rushTime=0;e.attackAnim=0;e.stun=Math.max(e.stun||0,.08);
      }
    }
    actor(x,y,face){return {x,y,face,vx:0,vy:0,moving:false,walk:0,cooldown:0,attacking:0,combo:0,struck:false,targetId:null};}
    martial(actor,index,dt,c,damage,laneOffset=0){
      actor.cooldown=Math.max(0,actor.cooldown-dt);actor.walk+=dt*14;
      const mobs=this.targets(c).sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y));
      const target=mobs.find(e=>e.id===actor.targetId)||mobs[index%Math.max(1,mobs.length)];
      const dx=(target?target.x:c.player.x+45+index*25)-actor.x,dy=(target?Math.max(340,Math.min(500,target.y+laneOffset)):c.player.y)-actor.y;
      actor.moving=false;
      if(actor.attacking>0){
        const before=actor.attacking;actor.attacking=Math.max(0,actor.attacking-dt);
        if(!actor.struck&&before>.23&&actor.attacking<=.23){
          actor.struck=true;const kick=actor.combo===2;
          for(const e of this.targets(c))if(Math.abs(e.x-actor.x)<(kick?100:76)&&Math.abs(e.y-actor.y)<42&&(e.x-actor.x)*actor.face> -18){
            this.damage(e,damage*(kick?1.45:1),c);e.stun=Math.max(e.stun||0,kick?.36:.18);
            this.active.effects.push({kind:"contact",x:e.x,y:e.y-60,age:0,duration:.13});
            this.emit({kind:"melee",x:e.x,y:e.y-60,kick});
          }
        }
        actor.vx*=Math.exp(-18*dt);actor.vy*=Math.exp(-18*dt);
      }else{
        actor.face=dx>=0?1:-1;
        const distance=Math.hypot(dx,dy),chasing=distance>56;
        const speed=450,blend=1-Math.exp(-18*dt);
        actor.vx+=((chasing?dx/(distance||1)*speed:0)-actor.vx)*blend;
        actor.vy+=((chasing?dy/(distance||1)*speed:0)-actor.vy)*blend;
        actor.moving=chasing;
        if(target&&Math.abs(dx)<70&&Math.abs(dy)<34&&actor.cooldown<=0){
          actor.targetId=target.id;actor.combo=(actor.combo+1)%4;actor.attacking=.4;actor.struck=false;actor.cooldown=.5;
        }
      }
      actor.x=Math.max(20,Math.min(c.width-20,actor.x+actor.vx*dt));actor.y=Math.max(330,Math.min(510,actor.y+actor.vy*dt));
    }
    update(dt,c){
      const a=this.active;if(!a||c.mode!=="playing"||!Number.isFinite(dt)||dt<=0)return;
      const step=Math.min(dt,DURATION-a.elapsed);let end=Math.min(DURATION,a.elapsed+step);if(DURATION-end<1e-9)end=DURATION;
      for(const effect of a.effects)effect.age+=step;
      a.effects=a.effects.filter(effect=>effect.age<effect.duration);
      if(c.phase==="wave"&&!c.transition){
        if(a.id==="narasimha"){
          a.target=this.target(c);
          while(a.nextPulse<=end&&a.nextPulse<DURATION){
            const primary=this.target(c);
            if(primary){
              const targets=[primary,...this.targets(c).filter(e=>e!==primary).sort((x,y)=>Math.hypot(x.x-primary.x,x.y-primary.y)-Math.hypot(y.x-primary.x,y.y-primary.y))].slice(0,3);
              const fromX=c.player.face>0?-80:c.width+80;
              let previous=null;
              for(const e of targets)if(this.damage(e,e.hp,c)){
                a.effects.push({kind:"sniper",x:e.x,y:e.y-55,fromX:previous?previous.x:fromX,fromY:previous?previous.y-55:e.y-73,age:0,duration:.22});
                this.emit({kind:"sniper",x:e.x,y:e.y});if(this.targetId===e.id)this.targetId=null;previous=e;
              }
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
        }else if(a.id==="swetha"&&!c.enemies.some(e=>!e.dead&&(e.type==="boss"||e.isBoss))){
          const helper=a.helper,tx=Math.max(25,Math.min(c.width-25,c.player.x-c.player.face*80)),ty=Math.max(334,Math.min(502,c.player.y-8));
          const distance=Math.hypot(tx-helper.x,ty-helper.y),blend=1-Math.exp(-6*step);
          helper.moving=distance>8;helper.face=c.player.face;helper.x+=(tx-helper.x)*blend;helper.y+=(ty-helper.y)*blend;helper.helpTime=Math.max(0,helper.helpTime-step);
          this.enforceBarrier(c);
          while(a.nextDrain<=end+1e-9&&a.nextDrain<=DURATION){
            for(const enemy of this.targets(c))if(Math.hypot(enemy.x-c.player.x,(enemy.y-c.player.y)*1.6)<=195)this.damage(enemy,25,c,{drain:true});
            a.nextDrain+=1;
          }
          while(a.nextPulse<=end&&a.nextPulse<DURATION){
            const before=Number.isFinite(c.player.hp)?c.player.hp:100;c.player.hp=Math.min(100,before+6);helper.helpTime=.6;
            this.emit({kind:"care",healed:c.player.hp-before,x:helper.x,y:helper.y});a.nextPulse+=1;
          }
        }else if(a.id==="hrithik"||a.id==="pragi"){
          // Small combat steps preserve contact timing even after a slow browser frame.
          for(let left=step;left>1e-9;){
            const tick=Math.min(.025,left);left-=tick;
            if(a.id==="pragi")this.martial(a.fighter,0,tick,c,48);
            else{
              a.agents.forEach((agent,i)=>this.martial(agent,i,tick,c,26,(i-1)*26));
              const g=a.gunner,mobs=this.targets(c),target=mobs.sort((x,y)=>Math.hypot(x.x-g.x,x.y-g.y)-Math.hypot(y.x-g.x,y.y-g.y))[0];
              g.cooldown=Math.max(0,g.cooldown-tick);g.recoil=Math.max(0,g.recoil-tick);
              if(target){
                g.face=target.x>=g.x?1:-1;
                const tx=Math.max(35,Math.min(c.width-35,target.x-g.face*210));
                g.x+=(tx-g.x)*(1-Math.exp(-5*tick));g.y+=(target.y-g.y)*(1-Math.exp(-5*tick));
                if(g.cooldown<=0){
                  g.burst=(g.burst+1)%3;g.cooldown=g.burst===0?.7:.12;g.recoil=.09;
                  this.damage(target,24,c);
                  a.effects.push({kind:"rifle",fromX:g.x+g.face*48,fromY:g.y-85,x:target.x,y:target.y-60,age:0,duration:.09});
                  this.emit({kind:"rifle",x:g.x+g.face*48,y:g.y-85});
                }
              }
            }
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
