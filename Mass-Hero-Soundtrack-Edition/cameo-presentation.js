(function(root){
  "use strict";
  const {ROSTER,isMob}=root.MassHeroCameos;
  const $=id=>document.getElementById(id);
  class CameoPresentation{
    constructor(support,{confirm,cancel,call,target}){
      this.support=support;this.choice=null;this.ready=false;this.error=false;this.frames=[];this.image=new Image();this.lastFocus=null;
      $("cameo-cards").innerHTML=ROSTER.map(r=>`<button type="button" class="cameo-card" role="radio" aria-checked="false" tabindex="-1" data-cameo="${r.id}" style="--cameo-color:${r.color}"><canvas width="220" height="270" aria-hidden="true"></canvas><strong>${r.name}</strong><span>${r.ability}</span><p>${r.description}</p></button>`).join("");
      this.cards=Array.from(document.querySelectorAll("[data-cameo]"));
      this.cards.forEach((card,i)=>{
        card.tabIndex=i===0?0:-1;
        card.addEventListener("click",()=>this.choose(card.dataset.cameo));
        card.addEventListener("keydown",event=>{
          if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
          event.preventDefault();const next=(i+(["ArrowLeft","ArrowUp"].includes(event.key)?-1:1)+ROSTER.length)%ROSTER.length;
          this.choose(ROSTER[next].id);this.cards[next].focus();
        });
      });
      $("cameo-confirm").addEventListener("click",()=>{if(this.error)this.load();else if(this.ready&&this.choice)confirm();});
      $("cameo-cancel").addEventListener("click",cancel);
      $("cameo-call").addEventListener("click",call);$("cameo-target").addEventListener("click",target);
      $("cameo-picker").addEventListener("keydown",event=>{
        if(event.key==="Escape"){event.preventDefault();event.stopPropagation();cancel();}
        if(event.key==="Tab"){
          const focusable=Array.from($("cameo-picker").querySelectorAll("button")).filter(button=>!button.disabled&&button.tabIndex>=0);
          const first=focusable[0],last=focusable[focusable.length-1];
          if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        }
      });
      this.image.onload=()=>{try{this.decode();this.baseReady=true;this.ready=!!this.actionReady&&!this.error;this.paintCards();this.updateConfirm();}catch(error){this.fail();}};
      this.image.onerror=()=>this.fail();
      this.actionFrames=[];const actionArt=this.actionImage=new Image();
      actionArt.onload=()=>{
        this.actionFrames=[];
        for(let i=0;i<16;i++){
          const w=actionArt.width/4,h=actionArt.height/4,canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
          const context=canvas.getContext("2d");context.drawImage(actionArt,(i%4)*w,Math.floor(i/4)*h,w,h,0,0,w,h);
          const data=context.getImageData(0,0,w,h).data;let left=w,top=h,right=0,bottom=0;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>80){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
          this.actionFrames.push({canvas,x:left,y:top,w:right-left+1,h:bottom-top+1});
        }
        this.actionReady=true;this.ready=!!this.baseReady&&!this.error;this.updateConfirm();
      };actionArt.onerror=()=>this.fail();this.load();
    }
    fail(){this.error=true;this.ready=false;this.updateConfirm();}
    load(){this.error=false;this.ready=false;this.baseReady=false;this.actionReady=false;this.updateConfirm();const version=Date.now();this.image.src="assets/cameo-roster.png?retry="+version;this.actionImage.src="assets/cameo-combat-actions.png?retry="+version;}
    decode(){
      // The reference-based atlas has extended rifles, command arms and a wide SUV.
      const regions=[[0,65,274,566],[270,65,241,566],[512,65,256,566],[770,65,254,566],[0,634,304,435],[275,675,235,394],[505,630,338,440],[733,704,291,366],[0,1080,266,420],[239,1080,245,420],[450,1080,286,420],[609,1200,415,270]];
      this.frames=regions.map(([x,y,w,h],index)=>{
        const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d");ctx.drawImage(this.image,x,y,w,h,0,0,w,h);
        const pixels=ctx.getImageData(0,0,w,h),data=pixels.data,labels=new Int32Array(w*h),queue=new Int32Array(w*h);let label=0,biggest=0,biggestSize=0;
        for(let py=0;py<h;py++)for(let px=0;px<w;px++){
          const gx=x+px,gy=y+py;
          const exclude=index===4&&gx>274&&gy>800||index===5&&gx<308&&gy<810||index===6&&gx>733&&gy>790||index===7&&gx<840&&gy<780||index===8&&gx>240&&gy>1300||index===9&&gx<266&&gy<1350||index===10&&(gx<485&&gy>1300||gx>610&&gy>1210)||index===11&&(gy<1215||gx<615);
          if(exclude)data[(py*w+px)*4+3]=0;
        }
        for(let start=0;start<w*h;start++){
          if(labels[start]||data[start*4+3]<=60)continue;
          label++;let head=0,tail=1;queue[0]=start;labels[start]=label;
          while(head<tail){const at=queue[head++],px=at%w;
            for(const next of [px>0?at-1:-1,px<w-1?at+1:-1,at>=w?at-w:-1,at<w*(h-1)?at+w:-1])if(next>=0&&!labels[next]&&data[next*4+3]>60){labels[next]=label;queue[tail++]=next;}
          }
          if(tail>biggestSize){biggestSize=tail;biggest=label;}
        }
        let left=w,top=h,right=0,bottom=0;
        for(let at=0;at<w*h;at++){
          if(labels[at]===biggest){const px=at%w,py=Math.floor(at/w);left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
          else if(labels[at])data[at*4+3]=0;
        }
        if(biggestSize<100||right-left<10||bottom-top<10)throw new Error("Missing cameo sprite");
        ctx.putImageData(pixels,0,0);return {canvas,x:left,y:top,w:right-left+1,h:bottom-top+1};
      });
    }
    choose(id){if(!ROSTER.some(r=>r.id===id))return;this.choice=id;this.cards.forEach(card=>{const selected=card.dataset.cameo===id;card.setAttribute("aria-checked",String(selected));card.tabIndex=selected?0:-1;});this.updateConfirm();}
    updateConfirm(){const selected=ROSTER.find(r=>r.id===this.choice);$("cameo-confirm").disabled=!this.error&&(!selected||!this.ready);$("cameo-confirm").textContent=this.error?"Retry cameo artwork":!this.ready?"Loading cameo artwork…":selected?"ENTER WITH "+selected.name.toUpperCase():"SELECT ONE CAMEO";$("cameo-selection-status").textContent=this.error?"Artwork could not load. Retry to continue.":selected?selected.name+" selected · "+selected.ability:"Choose one ally to join Thalaivar.";}
    open(){this.lastFocus=document.activeElement;this.choice=this.support.selected;this.cards.forEach((card,i)=>{const selected=card.dataset.cameo===this.choice;card.setAttribute("aria-checked",String(selected));card.tabIndex=selected||!this.choice&&i===0?0:-1;});$("cameo-picker").hidden=false;this.updateConfirm();(this.cards.find(card=>card.dataset.cameo===this.choice)||this.cards[0]).focus();}
    close(){ $("cameo-picker").hidden=true;if(this.lastFocus&&this.lastFocus.isConnected)this.lastFocus.focus({preventScroll:true}); }
    paintCards(){this.cards.forEach((card,i)=>{const canvas=card.querySelector("canvas"),ctx=canvas.getContext("2d");ctx.clearRect(0,0,220,270);this.sprite(ctx,i,110,263,245,1);});}
    sprite(ctx,index,x,y,height,face=1){const frame=this.frames[index];if(!frame)return;const width=frame.w/frame.h*height;ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.drawImage(frame.canvas,frame.x,frame.y,frame.w,frame.h,-width/2,-height,width,height);ctx.restore();}
    actionSprite(ctx,index,x,y,height,face){
      const frame=this.actionFrames[index];if(!frame)return false;
      const width=frame.w/frame.h*height;ctx.save();ctx.translate(x,y);ctx.scale(face,1);
      ctx.drawImage(frame.canvas,frame.x,frame.y,frame.w,frame.h,-width/2,-height,width,height);ctx.restore();return true;
    }
    martialSprite(ctx,actor,index){
      const attacking=actor.attacking>0,progress=attacking?( .4-actor.attacking)/.4:0;
      const extension=Math.sin(progress*Math.PI),bob=actor.moving?Math.abs(Math.sin(actor.walk))*3:0;
      let frame;
      if(index<0)frame=attacking?[3,4,5,7][actor.combo]:actor.moving?1+Math.floor(actor.walk/Math.PI)%2:0;
      else frame=10+index*2+(attacking?1:0);
      ctx.save();ctx.translate(actor.x+actor.face*extension*7,actor.y-bob);ctx.rotate(actor.face*extension*(actor.combo===2?-.07:.045));
      ctx.fillStyle="#080c1870";ctx.beginPath();ctx.ellipse(0,2,25,6,0,0,Math.PI*2);ctx.fill();
      if(!this.actionSprite(ctx,frame,0,0,index<0?132:124,actor.face))this.sprite(ctx,index<0?3:8+index,0,0,124,actor.face);
      ctx.restore();
    }
    updateHUD(c){
      const r=ROSTER.find(r=>r.id===this.support.selected),a=this.support.active;
      $("cameo-name").textContent=r?r.name+" · "+r.ability:"CAMEO SUPPORT";
      $("cameo-state").textContent=!r?"Pick one ally before play":c.phase==="boss"?"Boss duel · support locked":a?(Math.ceil(a.remaining*10)/10).toFixed(1)+"s remaining · normal waves only":this.support.used?"Used this wave · recharges next wave":"10 seconds · once per wave · C to summon";
      $("cameo-call").disabled=!this.ready||!this.support.canSummon(c);$("cameo-call").textContent=a?"SUPPORT ACTIVE":c.phase==="boss"?"BOSS LOCKED":"C · SUMMON";
      $("cameo-target").hidden=this.support.selected!=="narasimha";$("cameo-target").disabled=c.mode!=="playing"||c.phase!=="wave"||!this.support.targets(c).length;
      $("cameo-meter").style.width=a?a.remaining/10*100+"%":this.support.used?"0%":"100%";
      $("cameo-strip").style.setProperty("--cameo-color",r?r.color:"#8492b0");
    }
    pickTarget(event,canvas,c,zoom,centerX){
      if(this.support.selected!=="narasimha"||c.phase!=="wave"||c.mode!=="playing")return;
      const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/c.width,rect.height/c.height);
      const sx=(event.clientX-rect.left-(rect.width-c.width*scale)/2)/scale,sy=(event.clientY-rect.top-(rect.height-c.height*scale)/2)/scale;
      const x=(sx-c.width/2)/zoom+centerX,y=(sy-c.height/2)/zoom+c.height/2;
      const target=this.support.targets(c).filter(e=>Math.abs(e.x-x)<48&&y>=e.y-130&&y<=e.y+12).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];if(target)this.support.targetId=target.id;
    }
    render(ctx,c,clock,cinematic){
      const a=this.support.active;
      if(c.mode!=="playing"&&c.mode!=="paused")return;
      if(c.phase!=="wave")return;
      if(this.support.selected==="narasimha"){
        const target=this.support.target(c);
        if(target){ctx.save();ctx.strokeStyle="#d5ff9a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(target.x,target.y-60,23,0,Math.PI*2);ctx.moveTo(target.x-33,target.y-60);ctx.lineTo(target.x+33,target.y-60);ctx.moveTo(target.x,target.y-94);ctx.lineTo(target.x,target.y-26);ctx.stroke();ctx.restore();}
      }
      if(!a||!this.ready)return;
      ctx.save();
      if(a.id==="narasimha"){
        ctx.fillStyle="#101b25cc";ctx.fillRect(10,c.height-154,112,140);this.sprite(ctx,4,61,c.height-30,108,1);ctx.fillStyle="#d8ffae";ctx.font="bold 10px system-ui";ctx.fillText("SNIPER LINK · LIVE",16,c.height-20);
      }else if(a.id==="mathew"){
        const car=a.car,frame=this.frames[11],width=275,height=frame.h/frame.w*width;
        ctx.save();ctx.translate(car.x,car.y);ctx.scale(car.face,1);ctx.fillStyle="#080c18aa";ctx.beginPath();ctx.ellipse(0,5,130,12,0,0,Math.PI*2);ctx.fill();
        ctx.drawImage(frame.canvas,frame.x,frame.y,frame.w,frame.h,-width/2,-height,width,height);
        const driver=this.frames[5];ctx.save();ctx.beginPath();ctx.rect(15,-height*.81,51,height*.29);ctx.clip();
        ctx.drawImage(driver.canvas,driver.x+driver.w*.2,driver.y,driver.w*.65,driver.h*.42,15,-height*.81,51,height*.29);ctx.restore();
        ctx.strokeStyle="#ffbb7a88";ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-150-i*12,-25-i*12);ctx.lineTo(-190-i*12,-25-i*12);ctx.stroke();}ctx.restore();
      }else if(a.id==="hrithik"){
        const g=a.gunner;
        if(!this.actionSprite(ctx,g.recoil>0?9:8,g.x-g.face*g.recoil*24,g.y,138,g.face))this.sprite(ctx,2,g.x,g.y,138,g.face);
        a.agents.slice().sort((x,y)=>x.y-y.y).forEach(agent=>this.martialSprite(ctx,agent,a.agents.indexOf(agent)));
        if(g.recoil>0){ctx.fillStyle="#ffe1a1";ctx.beginPath();ctx.ellipse(g.x+g.face*54,g.y-85,8,3,0,0,Math.PI*2);ctx.fill();}
      }else if(a.id==="pragi"){
        this.martialSprite(ctx,a.fighter,-1);
      }
      for(const effect of a.effects){
        const fade=Math.max(0,1-effect.age/effect.duration);ctx.globalAlpha=fade;ctx.lineWidth=effect.kind==="sniper"?4:3;
        ctx.strokeStyle=effect.kind==="sniper"?"#d6ff9b":effect.kind==="slash"?"#e0b5ff":"#9aedff";
        ctx.beginPath();
        if(effect.kind==="contact"){
          for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;ctx.moveTo(effect.x+Math.cos(angle)*4,effect.y+Math.sin(angle)*4);ctx.lineTo(effect.x+Math.cos(angle)*14,effect.y+Math.sin(angle)*14);}
          ctx.strokeStyle="#ffdaa1";
        }else{ctx.strokeStyle=effect.kind==="rifle"?"#ffe2a0":"#d6ff9b";ctx.moveTo(effect.fromX,effect.fromY||effect.y-18);ctx.lineTo(effect.x,effect.y);}
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  root.CameoPresentation=CameoPresentation;
})(globalThis);
