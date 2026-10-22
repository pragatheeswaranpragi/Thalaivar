const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CelebrationSequence,DURATION,FRAME_COUNT,POSES,poseAt}=require('../celebration-sequence.js');
test('celebration supplies 48 distinct articulated animation keys',()=>{
 assert.equal(FRAME_COUNT,48);assert.equal(POSES.length,48);assert(new Set(POSES.map(JSON.stringify)).size>40);
 for(const t of [0,1,3,5,7,9,DURATION])assert(Object.values(poseAt(t)).every(Number.isFinite));
});
test('animation interpolates continuously around every choreography key',()=>{
 for(let i=1;i<FRAME_COUNT-1;i++){
  const t=i/(FRAME_COUNT-1)*DURATION,a=poseAt(t-.0001),b=poseAt(t+.0001);
  for(const key of Object.keys(a))assert(Math.abs(a[key]-b[key])<.1,`${i} ${key}`);
 }
 assert.notDeepEqual(poseAt(3.05),poseAt(3.06));
});
test('celebration runs once for the reference duration with reset and skip',()=>{
 const scene=new CelebrationSequence();scene.start();scene.update(DURATION-.01);assert(scene.active);scene.update(.01);assert.equal(scene.active,false);assert.equal(scene.elapsed,DURATION);
 scene.start();scene.update(2);scene.finish();assert.equal(scene.elapsed,DURATION);assert.equal(scene.active,false);scene.reset();assert.equal(scene.elapsed,0);
});
test('invalid deltas do not corrupt the scene and reduced motion is retained',()=>{
 const scene=new CelebrationSequence();scene.start({reducedMotion:true});for(const dt of [-1,NaN,Infinity])scene.update(dt);assert.equal(scene.elapsed,0);assert(scene.reducedMotion);scene.update(2);assert.equal(scene.elapsed,2);
});
