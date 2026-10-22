(function(root){
  "use strict";
  const DURATION=28.757313,TITLE_AT=23.366667;
  const clamp=(n,a,b)=>Math.max(a,Math.min(n,b)),mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  class VictorySequence{
    constructor({complete=()=>{},loadAssets=true}={}){
      this.complete=complete;this.elapsed=0;this.active=false;this.finished=false;this.reducedMotion=false;this.frames=[];this.titleFailed=false;
      this.embers=Array.from({length:70},(_,i)=>({x:(i*137+29)%960,y:(i*79+41)%540,size:1+i%3,speed:12+i%23}));
      if(loadAssets)this.load();
    }
    load(){
      if(this.hero)return;
      this.yard=new Image();this.yard.src="assets/victory-yard.png";
      this.hero=new Image();this.hero.onload=()=>{
        const w=this.hero.naturalWidth/3,h=this.hero.naturalHeight;
        this.frames=Array.from({length:3},(_,i)=>({x:Math.floor(i*w),y:0,w:Math.floor(w),h,faceX:[375,950,1548][i]/1881*this.hero.naturalWidth-Math.floor(i*w)}));
      };this.hero.src="assets/thalaivar-victory-poses.png";
      this.fallbackHero=new Image();this.fallbackHero.src="assets/thalaivar-cover.jpg";
      this.titleVideo=document.createElement("video");this.titleVideo.muted=true;this.titleVideo.playsInline=true;this.titleVideo.preload="auto";this.titleVideo.src="assets/victory-title-card.mp4";
      this.titleVideo.addEventListener("error",()=>{this.titleFailed=true;});
    }
    start({reducedMotion=false}={}){this.elapsed=0;this.active=true;this.finished=false;this.reducedMotion=reducedMotion;if(this.titleVideo){this.titleVideo.pause();try{this.titleVideo.currentTime=0;}catch(_){}}}
    reset(){this.active=false;this.elapsed=0;this.finished=false;if(this.titleVideo)this.titleVideo.pause();}
    pause(){if(this.titleVideo)this.titleVideo.pause();}
    finish(){if(this.finished)return;this.finished=true;this.active=false;this.pause();this.complete();}
    update(dt,audioClock=null){
      if(!this.active||!Number.isFinite(dt)||dt<0)return;
      this.elapsed=clamp(Number.isFinite(audioClock)?audioClock:this.elapsed+dt,0,DURATION);
      if(this.elapsed>=TITLE_AT&&this.titleVideo&&!this.reducedMotion&&!this.titleFailed){
        const video=this.titleVideo,target=Math.min(this.elapsed-TITLE_AT,Number.isFinite(video.duration)?Math.max(0,video.duration-.045):5);
        if(video.readyState>=1&&!video.seeking&&Math.abs(video.currentTime-target)>.35)try{video.currentTime=target;}catch(_){}
        if(video.readyState>=2&&video.paused&&target<video.duration-.05){const promise=video.play();if(promise)promise.catch(error=>{if(error.name==="NotAllowedError"||error.name==="NotSupportedError")this.titleFailed=true;});}
        if(Number.isFinite(video.duration)&&this.elapsed-TITLE_AT>=video.duration-.05)video.pause();
      }
      if(this.elapsed>=DURATION-1e-6)this.finish();
    }
    background(ctx,W,H,t){
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#142936");sky.addColorStop(.62,"#87968b");sky.addColorStop(1,"#d7b781");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      const sun=ctx.createRadialGradient(W*.77,H*.24,2,W*.77,H*.24,250);sun.addColorStop(0,"#ffe8aa99");sun.addColorStop(1,"#ffe8aa00");ctx.fillStyle=sun;ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#172b3299";for(let i=0;i<16;i++)ctx.fillRect(i*69-30,H*.55-(i*37%100),53+(i%3)*14,150);
      ctx.strokeStyle="#17272c66";ctx.lineWidth=2;for(let i=0;i<35;i++){const x=i*31;ctx.beginPath();ctx.moveTo(x,H*.48);ctx.lineTo(x,H*.72);ctx.stroke();}
      ctx.fillStyle="#b09d7b";ctx.fillRect(0,H*.71,W,H*.29);
      const ignition=this.reducedMotion?.7:ease((t-2.7)/2.6);
      if(this.yard?.complete&&this.yard.naturalWidth){
        ctx.save();const scale=Math.max(W/this.yard.naturalWidth,H/this.yard.naturalHeight)*(this.reducedMotion?1:1.035);
        const width=this.yard.naturalWidth*scale,height=this.yard.naturalHeight*scale;
        ctx.globalAlpha=.25+ignition*.75;ctx.drawImage(this.yard,(W-width)/2+(this.reducedMotion?0:Math.sin(t*.09)*8),(H-height)/2,width,height);ctx.restore();
      }else for(let i=0;i<3;i++){
        const x=W*[.19,.49,.81][i],y=H*.67;
        ctx.save();ctx.globalAlpha=.65*ignition;
        for(let j=0;j<7;j++){const a=j*2.4+i*1.7,r=(37+j*13)*ignition,drift=this.reducedMotion?0:Math.sin(t*.8+j)*14;
          ctx.fillStyle=j%2?"#3a342ccc":"#545044bb";ctx.beginPath();ctx.ellipse(x+Math.cos(a)*r*.7+drift,y-r*1.2-j*10,r*.85,r*1.1,0,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=ignition;
        for(let j=0;j<6;j++){const flicker=this.reducedMotion?1:1+Math.sin(t*3+j*2+i)*.07,r=(29+j*8)*flicker;
          const fire=ctx.createRadialGradient(x+Math.sin(j*2)*40,y-j*16,1,x+Math.sin(j*2)*40,y-j*16,r);fire.addColorStop(0,"#fff4b9");fire.addColorStop(.3,"#ffb937");fire.addColorStop(.65,"#ed5d1599");fire.addColorStop(1,"#ca3c1000");ctx.fillStyle=fire;ctx.fillRect(x-150,y-220,300,280);}
        ctx.restore();
      }
      const dust=ctx.createLinearGradient(0,H*.65,0,H);dust.addColorStop(0,"#f4dcb400");dust.addColorStop(1,"#f4dcb430");ctx.fillStyle=dust;ctx.fillRect(0,H*.65,W,H*.35);
    }
    glasses(ctx,W,H,t){
      const fade=1-ease((t-6)/1.8);if(fade<=0)return;
      ctx.save();ctx.globalAlpha=fade;ctx.translate(W*.47,H*.57);ctx.rotate(this.reducedMotion?-.06:mix(-.15,-.025,ease(t/7)));const scale=this.reducedMotion?1:mix(1.08,.95,ease(t/8));ctx.scale(scale,scale);
      const skin=ctx.createLinearGradient(200,0,480,170);skin.addColorStop(0,"#dda679");skin.addColorStop(1,"#76503c");ctx.fillStyle=skin;ctx.beginPath();ctx.roundRect(221,9,360,87,38);ctx.fill();
      for(const x of [-196,27]){
        ctx.save();ctx.beginPath();ctx.roundRect(x,-30,181,125,23);ctx.clip();ctx.fillStyle="#162c36e8";ctx.fillRect(x,-30,181,125);
        const reflection=ctx.createRadialGradient(x+86,65,2,x+86,65,100);reflection.addColorStop(0,"#ffe6a9cc");reflection.addColorStop(.35,"#ef7f2199");reflection.addColorStop(1,"#16313a00");ctx.fillStyle=reflection;ctx.fillRect(x,-30,181,125);ctx.restore();
        ctx.strokeStyle="#10171d";ctx.lineWidth=14;ctx.beginPath();ctx.roundRect(x,-30,181,125,23);ctx.stroke();ctx.strokeStyle="#a6997a88";ctx.lineWidth=2;ctx.stroke();
      }
      ctx.strokeStyle="#131a20";ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(-16,1);ctx.quadraticCurveTo(4,-9,26,1);ctx.moveTo(208,-12);ctx.lineTo(285,-120);ctx.moveTo(-195,-13);ctx.lineTo(-252,-95);ctx.stroke();
      ctx.restore();
    }
    portrait(ctx,index,W,H,height,top,alpha){
      if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;
      const frame=this.frames[index];
      if(frame){const scale=height/frame.h;ctx.drawImage(this.hero,frame.x,frame.y,frame.w,frame.h,W/2-frame.faceX*scale,top,frame.w*scale,height);}
      else if(this.fallbackHero?.complete&&this.fallbackHero.naturalWidth){const width=height*this.fallbackHero.naturalWidth/this.fallbackHero.naturalHeight;ctx.drawImage(this.fallbackHero,W/2-width/2,top,width,height);}
      ctx.restore();
    }
    fallbackTitle(ctx,W,H){
      if(!this.titleDots){const mask=document.createElement("canvas");mask.width=960;mask.height=540;const pen=mask.getContext("2d");pen.fillStyle="white";pen.font="900 105px sans-serif";pen.textAlign="center";pen.fillText("SUPER",480,180,720);pen.fillText("STAR",480,419,650);const data=pen.getImageData(0,0,960,540).data;this.titleDots=[];for(let y=45;y<470;y+=11)for(let x=90;x<870;x+=11)if(data[(y*960+x)*4+3]>110)this.titleDots.push([x,y]);}
      ctx.fillStyle="#030309";ctx.fillRect(0,0,W,H);ctx.save();ctx.scale(W/960,H/540);ctx.fillStyle="#a7a2bf33";for(let y=40;y<500;y+=12)for(let x=90;x<880;x+=12){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle="#6448ff";ctx.shadowColor="#4022ff";ctx.shadowBlur=7;for(const [x,y] of this.titleDots){ctx.beginPath();ctx.arc(x,y,3.1,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
      const gold=ctx.createLinearGradient(0,225,0,300);gold.addColorStop(0,"#fff6d0");gold.addColorStop(.5,"#b67b43");gold.addColorStop(.6,"#ffe4b8");gold.addColorStop(1,"#6c3f27");ctx.fillStyle=gold;ctx.font="900 65px Georgia,serif";ctx.textAlign="center";ctx.fillText("RAJINI",480,288);ctx.restore();
    }
    render(ctx,W,H){
      const t=this.elapsed;ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
      if(t>=TITLE_AT){
        const video=this.titleVideo;
        if(video&&!this.titleFailed&&!this.reducedMotion&&video.readyState>=2){const scale=Math.min(W/video.videoWidth,H/video.videoHeight);ctx.drawImage(video,(W-video.videoWidth*scale)/2,(H-video.videoHeight*scale)/2,video.videoWidth*scale,video.videoHeight*scale);}
        else this.fallbackTitle(ctx,W,H);
      }else{
        this.background(ctx,W,H,t);
        const reveal=ease((t-6)/1.6),adjust=ease((t-9.7)/.7),stare=ease((t-12)/.65),close=this.reducedMotion?0:ease((t-13)/9);
        const height=mix(540,1000,close),top=mix(65,-5,close);
        this.portrait(ctx,0,W,H,height,top,reveal*(1-adjust));this.portrait(ctx,1,W,H,height,top,reveal*adjust*(1-stare));this.portrait(ctx,2,W,H,height,top,reveal*stare);
        this.glasses(ctx,W,H,t);
        if(!this.reducedMotion){ctx.save();ctx.globalAlpha=.55;for(const ember of this.embers){const x=(ember.x+Math.sin(t*.4+ember.x)*25+W)%W,y=(ember.y-t*ember.speed%H+H)%H;ctx.fillStyle=ember.size%2?"#ffc265":"#fff0b0";ctx.fillRect(x,y,ember.size,ember.size*.7);}ctx.restore();}
        const grade=ctx.createLinearGradient(0,0,W,H);grade.addColorStop(0,"#11253d28");grade.addColorStop(.6,"#f8a74c09");grade.addColorStop(1,"#21101e35");ctx.fillStyle=grade;ctx.fillRect(0,0,W,H);
        const fade=ease((t-22.75)/(TITLE_AT-22.75));if(fade>0){ctx.fillStyle="rgba(0,0,0,"+fade+")";ctx.fillRect(0,0,W,H);}
      }
      ctx.fillStyle="#000";ctx.fillRect(0,0,W,38);ctx.fillRect(0,H-38,W,38);ctx.restore();
    }
  }
  const api={VictorySequence,DURATION,TITLE_AT};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.MassHeroVictory=api;
})(globalThis);
