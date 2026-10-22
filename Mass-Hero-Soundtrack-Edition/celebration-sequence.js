/* Original, articulated game animation. The reference recording is never played. */
(function(root){
  'use strict';
  const DURATION=11.18,FRAME_COUNT=48,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // 48 choreography keys: entrance, hand flourishes, low steps, chorus, final beckon.
  // Each key drives the torso, arms, legs and skirt; splines fill every display frame.
  const POSES=Array.from({length:FRAME_COUNT},(_,i)=>{
    const beat=i*TAU/8,s=Math.sin(beat),c=Math.cos(beat),section=Math.floor(i/8);
    const raised=section===1||section===5,low=section===2;
    return {lean:s*.085,bob:low?16:Math.abs(s)*5,hip:s*9,
      lu:raised?-2.25+s*.2:-1.05+s*.55,ll:raised?-1.3+c*.35:-.45-c*.5,
      ru:raised?2.25+s*.2:1.05+s*.55,rl:raised?1.3-c*.35:.45+c*.5,
      lt:-.18+s*.16,lk:low?.8:.15+Math.max(0,-s)*.42,
      rt:.18+s*.16,rk:low?-.8:-.15-Math.max(0,s)*.42,
      turn:section===4?s*.32:s*.1,hair:-s*.1,step:section===3?s*17:s*6};
  });
  const spline=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  function poseAt(time,offset=0){
    const index=clamp(time/DURATION*(FRAME_COUNT-1)+offset,0,FRAME_COUNT-1),key=Math.floor(index),t=index-key,result={};
    for(const name of Object.keys(POSES[0]))result[name]=spline(POSES[Math.max(0,key-1)][name],POSES[key][name],POSES[Math.min(FRAME_COUNT-1,key+1)][name],POSES[Math.min(FRAME_COUNT-1,key+2)][name],t);
    return result;
  }
  class CelebrationSequence{
    constructor(){this.elapsed=0;this.active=false;this.reducedMotion=false;this.sprites=[];}
    load(){
      if(this.art||typeof Image==='undefined')return;
      this.stage=new Image();this.stage.src="assets/level-one-festival-stage.png";
      this.art=new Image();this.art.onload=()=>{
        const cellW=this.art.width/4,h=this.art.height;
        this.sprites=Array.from({length:4},(_,i)=>{
          const canvas=document.createElement('canvas');canvas.width=cellW;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(this.art,i*cellW,0,cellW,h,0,0,cellW,h);
          const data=ctx.getImageData(0,0,cellW,h).data;let l=cellW,r=0,t=h,b=0;
          for(let y=0;y<h;y++)for(let x=0;x<cellW;x++)if(data[(y*cellW+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
          return {canvas,x:l,y:t,w:r-l+1,h:b-t+1};
        });
      };this.art.src='assets/level-one-dancers.png';
    }
    start({reducedMotion=false}={}){this.load();this.elapsed=0;this.active=true;this.reducedMotion=reducedMotion;}
    reset(){this.active=false;this.elapsed=0;}
    finish(){this.elapsed=DURATION;this.active=false;}
    update(dt){if(!this.active||!Number.isFinite(dt)||dt<0)return;this.elapsed=Math.min(DURATION,this.elapsed+dt);if(this.elapsed>=DURATION)this.active=false;}
    limb(ctx,from,to,width,color){
      ctx.lineCap='round';ctx.strokeStyle='#3e201b';ctx.lineWidth=width+2;ctx.beginPath();ctx.moveTo(...from);ctx.lineTo(...to);ctx.stroke();
      const g=ctx.createLinearGradient(from[0]-width/2,from[1],from[0]+width/2,to[1]);g.addColorStop(0,'#9c583c');g.addColorStop(.45,color);g.addColorStop(1,'#bf7753');ctx.strokeStyle=g;ctx.lineWidth=width;ctx.stroke();
    }
    chain(origin,upper,lower,length1,length2){const mid=[origin[0]+Math.sin(upper)*length1,origin[1]+Math.cos(upper)*length1];return [mid,[mid[0]+Math.sin(upper+lower)*length2,mid[1]+Math.cos(upper+lower)*length2]];}
    piece(ctx,frame,top,bottom,x,y,w,h,left=.32,right=.68){
      if(!frame)return false;
      ctx.drawImage(frame.canvas,frame.x+frame.w*left,frame.y+frame.h*top,frame.w*(right-left),frame.h*(bottom-top),x,y,w,h);return true;
    }
    dancer(ctx,x,y,scale,lead,index,time){
      const p=poseAt(this.reducedMotion?3:time,lead?0:(index%3-1)*.5),skin=lead?'#e9b18a':'#d7956b',fabric=lead?'#2d8b74':'#b51c34';
      const f=this.sprites[lead?0:2+index%2];
      ctx.save();ctx.translate(x+p.step,y);ctx.scale(scale,scale);
      ctx.fillStyle='#3b160f55';ctx.beginPath();ctx.ellipse(0,2,36,7,0,0,TAU);ctx.fill();
      ctx.translate(p.hip,-p.bob);ctx.scale(1-Math.abs(p.turn)*.2,1);
      const hips=[[-13,-88],[13,-88]],angles=[[p.lt,p.lk],[p.rt,p.rk]];
      hips.forEach((hip,i)=>{
        const [knee,foot]=this.chain(hip,...angles[i],43,43);this.limb(ctx,hip,knee,16,skin);this.limb(ctx,knee,foot,12,skin);
        ctx.strokeStyle='#d7b56c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(foot[0]-5,foot[1]-5);ctx.lineTo(foot[0]+5,foot[1]-5);ctx.stroke();
        ctx.fillStyle='#563521';ctx.beginPath();ctx.ellipse(foot[0]+2,foot[1]+1,10,4,-.1,0,TAU);ctx.fill();
      });
      // Cloth is attached to the hips and deforms with the same motion as the legs.
      const skirt=ctx.createLinearGradient(-35,-90,35,-5);skirt.addColorStop(0,lead?'#74b6a0':'#e33e45');skirt.addColorStop(.55,fabric);skirt.addColorStop(1,lead?'#174d43':'#650f23');
      ctx.fillStyle=skirt;ctx.beginPath();ctx.moveTo(-22,-94);ctx.quadraticCurveTo(-32+p.step*.3,-45,-39+p.step*.5,-4);ctx.lineTo(-9,-8);ctx.lineTo(2,-36);ctx.lineTo(18,-9);ctx.lineTo(40+p.step*.6,-5);ctx.quadraticCurveTo(27,-55,22,-94);ctx.closePath();ctx.fill();
      if(f){
        ctx.save();ctx.clip();
        for(let strip=0;strip<16;strip++){
          const t=strip/16,next=(strip+1)/16,drift=Math.sin(time*5+t*3)*t*2;
          const sy=f.y+f.h*(.435+t*.525),sh=f.h*.525/16;
          ctx.drawImage(f.canvas,f.x+f.w*.08,sy,f.w*.84,sh,-43+drift,-94+t*94,86,94/16+.7);
        }
        ctx.restore();
      }
      ctx.strokeStyle='#e1c281';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-22,-93);ctx.quadraticCurveTo(0,-88,22,-93);ctx.stroke();
      ctx.save();ctx.translate(0,-91);ctx.rotate(p.lean);
      // Painted costume and portrait, with fully articulated limbs around them.
      ctx.save();ctx.beginPath();ctx.moveTo(-22,-82);ctx.lineTo(22,-82);ctx.lineTo(27,-65);ctx.lineTo(18,-31);ctx.lineTo(28,2);ctx.lineTo(-28,2);ctx.lineTo(-18,-31);ctx.lineTo(-27,-65);ctx.closePath();ctx.clip();
      if(!this.piece(ctx,f,.205,.435,-31,-82,62,88)){
        ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-37,23,43,0,0,TAU);ctx.fill();ctx.fillStyle=fabric;ctx.fillRect(-25,-76,50,38);
      }
      ctx.restore();
      [[[-24,-66],p.lu,p.ll],[ [24,-66],p.ru,p.rl]].forEach(([shoulder,upper,lower],side)=>{
        const [elbow,hand]=this.chain(shoulder,upper,lower,34,31);this.limb(ctx,shoulder,elbow,11,skin);this.limb(ctx,elbow,hand,8,skin);
        ctx.strokeStyle='#e6c78d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(hand[0]-3,hand[1]-4);ctx.lineTo(hand[0]+3,hand[1]-4);ctx.stroke();
        ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(hand[0],hand[1],5,7,-upper,0,TAU);ctx.fill();
        // Open-hand flourishes animate individual fingers instead of freezing the hands.
        ctx.strokeStyle=skin;ctx.lineWidth=2;for(let finger=0;finger<3;finger++){ctx.beginPath();ctx.moveTo(hand[0]+(finger-1)*3,hand[1]);ctx.lineTo(hand[0]+(finger-1)*4,hand[1]-9-Math.sin(time*4+finger)*2);ctx.stroke();}
      });
      ctx.save();ctx.translate(0,-88);ctx.rotate(p.hair*.22);
      if(!this.piece(ctx,f,0,.18,-59,-57,118,68,.15,.85)){
        ctx.fillStyle='#34211c';ctx.beginPath();ctx.ellipse(0,-24,28,35,0,0,TAU);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-22,16,23,0,0,TAU);ctx.fill();
      }
      ctx.restore();ctx.restore();ctx.restore();
    }
    render(ctx,w,h,{drawHero=()=>{}}={}){
      const time=this.elapsed,progress=clamp(time/DURATION,0,1),motion=this.reducedMotion?0:time;
      ctx.save();ctx.scale(w/960,h/540);
      const sky=ctx.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#23121f');sky.addColorStop(.46,'#85451e');sky.addColorStop(1,'#da9b58');ctx.fillStyle=sky;ctx.fillRect(0,0,960,540);
      const light=ctx.createRadialGradient(480,130,10,480,210,600);light.addColorStop(0,'#ffdb9288');light.addColorStop(1,'#ffda7800');ctx.fillStyle=light;ctx.fillRect(0,0,960,540);
      for(let i=0;i<12;i++){
        const x=i*88-20;ctx.fillStyle=i%2?'#642d29':'#743932';ctx.beginPath();ctx.moveTo(x,0);ctx.quadraticCurveTo(x+75,150,x+36,370);ctx.lineTo(x+88,370);ctx.lineTo(x+88,0);ctx.fill();
        ctx.strokeStyle='#d49d62';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,20);ctx.quadraticCurveTo(x+50,150,x+35,350);ctx.stroke();
      }
      ctx.strokeStyle='#d0a667';ctx.lineWidth=9;ctx.strokeRect(55,55,850,325);
      ctx.fillStyle='#b96b37';ctx.beginPath();ctx.moveTo(0,365);ctx.lineTo(960,365);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.fill();
      for(let i=0;i<24;i++){ctx.fillStyle='#ffdf99';ctx.beginPath();ctx.arc(25+i*40,48+Math.sin(i/23*Math.PI)*26,2.5,0,TAU);ctx.fill();}
      if(this.stage?.complete&&this.stage.naturalWidth)ctx.drawImage(this.stage,0,0,960,540);
      const close=this.reducedMotion?0:time<1.3?0:time<4.7?.32:time>8.7?.46:0;
      const zoom=1+close*Math.sin(Math.min(1,(time<4.7?time-1.3:time-8.7)/.65)*Math.PI/2);
      ctx.save();ctx.translate(480,285);ctx.scale(zoom,zoom);ctx.translate(-480,-285);
      for(let i=0;i<8;i++)this.dancer(ctx,160+i*94,414,.73,false,i,motion-.15);
      this.dancer(ctx,245,480,1.02,false,0,motion);this.dancer(ctx,715,480,1.02,false,1,motion);
      this.dancer(ctx,480,483,1.38,true,0,motion);
      // Thalaivar stays in the celebration as the camera moves to the dance troupe.
      if(time<2.2||time>9.8){ctx.save();ctx.translate(790,468);const reveal=clamp(time<2.2?(2.2-time)/.5:(time-9.8)/.5,0,1);ctx.globalAlpha=reveal;drawHero(ctx,0,0);ctx.restore();}
      ctx.restore();
      if(!this.reducedMotion)for(let i=0;i<38;i++){
        ctx.fillStyle=['#ffdb8b','#ea8d68','#e9c6a2'][i%3];const x=(i*137+motion*(8+i%7))%980,y=(i*53+motion*(24+i%13))%570;ctx.save();ctx.translate(x,y);ctx.rotate(motion+i);ctx.fillRect(-2,-4,3,7);ctx.restore();
      }
      ctx.fillStyle='#100f20';ctx.fillRect(0,0,960,29);ctx.fillRect(0,511,960,29);
      ctx.textAlign='center';ctx.fillStyle='#ffe1a5';ctx.font='900 21px system-ui';ctx.fillText('LEVEL 1 CONQUERED',480,65);
      ctx.font='700 11px system-ui';ctx.fillStyle='#fff0d2';ctx.fillText(time<8.8?'THE ENFORCER IS DOWN · CELEBRATE THE VICTORY':'MILL LOCKDOWN · WAVE 2 IS COMING',480,497);
      ctx.fillStyle='#ffdc91';ctx.fillRect(0,536,960*progress,4);ctx.restore();
    }
  }
  const api={CelebrationSequence,DURATION,FRAME_COUNT,POSES,poseAt};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MassHeroCelebration=api;
})(globalThis);
