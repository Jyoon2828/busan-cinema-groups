/** Regression: actual RTDB SDK values can contain null gaps at numeric keys. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeRealtimeValue,recordValues} from '../model.js';
import {lessonHTML} from '../lesson.js';
const require=createRequire(process.env.CINEMA_TEST_REQUIRE_FROM||import.meta.url);
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const env=await initializeTestEnvironment({projectId:'demo-cinema-classroom3',database:{host:'127.0.0.1',port:9000}});
const post=(number)=>({cinemaId:'lotte',questionId:'joy',text:'가족과 함께할 수 있다.',number:String(number),name:'확인용'+number});
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const fn=app.split('\n').filter(line=>/^function (currentStudentOpinions|currentOpinionCount|myPostedOpinion|opinionChanged)\(/.test(line)).join('\n');
const contextFor=(value)=>({s:{opinions:value,studentGroup:{cinemaId:'lotte'},profile:{number:'1'},opinion:post(1),groups:{g1:{cinemaId:'lotte'}},opinionHeads:{g1:value}},recordValues});
let passed=0;const check=(label,fn)=>{fn();passed++;console.log('PASS '+label);};
try{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.database(),ref=db.ref('numbered-records-regression');
  await ref.set({'1':post(1),'3':post(3)});
  const snapshot=await ref.once('value'),sdkValue=snapshot.val(),raw=JSON.parse(JSON.stringify(sdkValue));
  check('official SDK returns numeric children as an array',()=>{assert.ok(Array.isArray(sdkValue));assert.ok(sdkValue[0]==null);assert.ok(sdkValue[2]==null);});
  check('application snapshot copy exposes empty slots as null',()=>{assert.equal(raw[0],null);assert.equal(raw[2],null);});
  check('old filtering reproduces the reported cinemaId error',()=>assert.throws(()=>Object.values(raw).filter(o=>o.cinemaId==='lotte'),/cinemaId/));
  const normalized=normalizeRealtimeValue(raw);
  check('normalization preserves student numbers and removes gaps',()=>{assert.deepEqual(Object.keys(normalized),['1','3']);assert.equal(normalized['3'].number,'3');});
  check('nested participation heads and roster normalize safely',()=>{const n=normalizeRealtimeValue({members:raw,opinionHeads:{g1:raw}});assert.equal(Object.keys(n.members).length,2);assert.equal(Object.keys(n.opinionHeads.g1).length,2);});
  for(const [label,value] of [['raw SDK array',raw],['normalized map',normalized]]){
   check(label+' renders student board without empty posts',()=>assert.deepEqual(Array.from(vm.runInNewContext(fn+'\ncurrentStudentOpinions().map(p=>p.number)',contextFor(value))),['1','3']));
   check(label+' counts only actual teacher participation',()=>assert.equal(vm.runInNewContext(fn+'\ncurrentOpinionCount("g1")',contextFor(value)),2));
   check(label+' retains own posted opinion for final submission',()=>assert.equal(vm.runInNewContext(fn+'\nmyPostedOpinion().number',contextFor(value)),'1'));
  }
  check('lesson participation screen accepts raw SDK null gaps',()=>{const html=lessonHTML({slide:8,reveal:0,DATA:[],esc:String,img:()=>'',btn:()=>'',groups:{g1:{id:'g1',name:'1모둠',cinemaId:'lotte'}},summaries:{},opinionHeads:{g1:raw}});assert.ok(html.includes('2명의 의견'));});
  await ref.child('1').remove();
  const removed=(await ref.once('value')).val();
  check('removed student is not included in board or count',()=>assert.deepEqual(recordValues(removed).map(v=>v.number),['3']));
  await ref.set({'40':post(40)});
  const sparse=(await ref.once('value')).val();
  check('sparse high student number is not renumbered',()=>{assert.equal(normalizeRealtimeValue(sparse)['40'].number,'40');assert.equal(recordValues(sparse).length,1);});
  check('empty database value produces an empty record list',()=>assert.deepEqual(recordValues(null),[]));
  await ref.remove();
 });
 console.log(passed+' numbered-record regression cases passed.');
}finally{await env.cleanup();}
