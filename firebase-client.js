/* Firebase traffic is limited to explicit submissions and small classroom signals. */
import { validateSubmission, defaultsRoomGroups, ROOM_TTL_MS, GROUP_IDS, CINEMA_IDS, normalizeProfile, validateOpinion } from './model.js';
const NS='cinemaClassV3', SDK='https://www.gstatic.com/firebasejs/12.19.0/';
let sdk, configured=false, configuration, connecting;
const instances={}, busy={teacher:0,student:0}, active={teacher:0,student:0}, idleTimers={}, caches=new Map();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const path=(...parts)=>[NS,...parts].join('/');
function fail(code,message){const e=new Error(message);e.code=code;throw e;}
function roomId(value){const id=String(value||'').trim().toUpperCase();if(!/^[A-Z2-9]{8}$/.test(id))fail('room/invalid','수업 코드를 확인해 주세요.');return id;}
function groupId(value){if(!GROUP_IDS.includes(value))fail('group/invalid','모둠을 확인해 주세요.');return value;}
export function isConfigured(config=globalThis.CINEMA_FIREBASE_CONFIG){return !!config&&['apiKey','authDomain','databaseURL','projectId','appId'].every(k=>typeof config[k]==='string'&&config[k].trim()&&!/YOUR_|여기에|example|placeholder/i.test(config[k]));}
export async function connect(config=globalThis.CINEMA_FIREBASE_CONFIG){
 if(!isConfigured(config))return {configured:false};
 if(configured){if(['apiKey','authDomain','databaseURL','projectId','appId'].some(k=>config[k]!==configuration[k]))fail('setup/reload','Firebase 연결 정보를 바꿨다면 설정 파일을 적용한 뒤 새로고침해 주세요.');return {configured:true};}
 if(connecting)return connecting;
 connecting=(async()=>{
  const [app,auth,database]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-database.js')]);sdk={...app,...auth,...database};configuration={...config};
  for(const role of ['teacher','student']){
   const appName='busan-cinema-classroom-v3-'+role;
   const application=sdk.getApps().find(a=>a.name===appName)||sdk.initializeApp(configuration,appName);
   const authentication=sdk.getAuth(application);await sdk.setPersistence(authentication,sdk.browserLocalPersistence);await authentication.authStateReady();
   instances[role]={app:application,auth:authentication,db:null};
  }
  configured=true;return {configured:true};
 })();
 try{return await connecting;}catch(e){connecting=null;throw e;}
}
function instance(role){if(!configured)fail('setup/missing','먼저 Firebase 연결 설정을 완료해 주세요.');const i=instances[role];if(!i.db){i.db=sdk.getDatabase(i.app);sdk.goOffline(i.db);}return i;}
function publicUser(user){return user?{uid:user.uid,displayName:user.displayName||'선생님'}:null;}
export function teacherUser(){const user=instances.teacher?.auth.currentUser;return user&&!user.isAnonymous?publicUser(user):null;}
export async function teacherLogin(){const i=instance('teacher');if(i.auth.currentUser&&!i.auth.currentUser.isAnonymous)return publicUser(i.auth.currentUser);const p=new sdk.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});return publicUser((await sdk.signInWithPopup(i.auth,p)).user);}
export async function teacherLogout(){if(instances.teacher){if(instances.teacher.db)sdk.goOffline(instances.teacher.db);await sdk.signOut(instances.teacher.auth);}}
export async function ensureStudent(){const i=instance('student');if(i.auth.currentUser?.isAnonymous)return {uid:i.auth.currentUser.uid};if(i.auth.currentUser)await sdk.signOut(i.auth);return {uid:(await sdk.signInAnonymously(i.auth)).user.uid};}
function requireTeacher(){const u=teacherUser();if(!u)fail('auth/teacher-required','교사 Google 로그인이 필요해요.');return u;}
function idle(role){clearTimeout(idleTimers[role]);idleTimers[role]=setTimeout(()=>{if(!busy[role]&&!active[role]&&instances[role]?.db)sdk.goOffline(instances[role].db);},300);}
async function operation(role,work){const i=instance(role);busy[role]++;clearTimeout(idleTimers[role]);sdk.goOnline(i.db);try{return await work(i.db);}finally{busy[role]--;idle(role);}}
const read=(role,p)=>operation(role,async db=>(await sdk.get(sdk.ref(db,p))).val());
const write=(role,p,value)=>operation(role,db=>sdk.set(sdk.ref(db,p),value));
const update=(role,values)=>operation(role,db=>sdk.update(sdk.ref(db),values));
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=crypto.getRandomValues(new Uint8Array(8));return [...a].map(v=>chars[v%chars.length]).join('');}
function token(){const a=crypto.getRandomValues(new Uint8Array(32));let s='';for(const v of a)s+=String.fromCharCode(v);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function createRoom({title='우리 지역 영화관 탐험',assignments={}}={}){
 const user=requireTeacher(),id=randomCode(),createdAt=Date.now(),expiresAt=createdAt+ROOM_TTL_MS;
 const groups=defaultsRoomGroups(assignments);
 const room={title:String(title).trim().slice(0,60)||'우리 지역 영화관 탐험',open:true,phase:'research',slide:0,reveal:0,presentingGroup:'',timerEndsAt:0,createdAt,expiresAt};
 await write('teacher',path('meta',id),{ownerUid:user.uid,createdAt,expiresAt});
 try{await update('teacher',{[path('public',id)]:room,[path('groups',id)]:groups});}catch(e){await write('teacher',path('meta',id),null).catch(()=>{});throw e;}
 return {roomId:id,meta:room,groups};
}
export async function getRoom(id){id=roomId(id);await ensureStudent();const value=await read('student',path('public',id));if(!value)fail('room/missing','수업을 찾지 못했어요. 수업 코드를 확인해 주세요.');if(value.expiresAt<Date.now())fail('room/expired','수업의 사용 기간이 끝났어요.');return {...value,roomId:id};}
export async function getTeacherRoom(id){id=roomId(id);requireTeacher();const [meta,room,groups]=await Promise.all([read('teacher',path('meta',id)),read('teacher',path('public',id)),read('teacher',path('groups',id))]);if(!meta||!room)fail('room/missing','수업을 만든 Google 계정과 수업 코드를 확인해 주세요.');return {meta:{...room,roomId:id},groups:groups||{}};}
export async function updateAssignments(id,assignments){id=roomId(id);requireTeacher();const wanted=defaultsRoomGroups(assignments),changes={};for(const g of GROUP_IDS)changes[path('groups',id,g,'cinemaId')]=wanted[g].cinemaId;await update('teacher',changes);}
export async function joinStudent(id,input){
 id=roomId(id);const wanted=normalizeProfile(input),user=await ensureStudent(),room=await getRoom(id);
 const oldNumber=await read('student',path('registrations',id,user.uid));
 let profile;
 if(oldNumber){
  profile=await read('student',path('members',id,oldNumber));
  if(!profile||['number','groupId','name'].some(k=>profile[k]!==wanted[k]))fail('entry/already','이 기기에 다른 입장 정보가 남아 있어요. 선생님 화면의 참여 학생에서 입장을 초기화해 주세요.');
 }else{
  if(!room.open)fail('room/closed','아직 입장할 수 없어요. 선생님께 제출 열기를 부탁하세요.');
  profile={...wanted,uid:user.uid,joinedAt:Date.now()};
  try{await update('student',{[path('members',id,wanted.number)]:profile,[path('registrations',id,user.uid)]:wanted.number});}
  catch(e){if(/permission/i.test(e.code||''))fail('entry/occupied','이미 사용 중인 번호이거나 수업 입장이 닫혀 있어요. 번호를 확인하고, 필요하면 선생님께 입장 초기화를 부탁하세요.');throw e;}
 }
 const [group,writer,summary]=await Promise.all([read('student',path('groups',id,wanted.groupId)),read('student',path('writers',id,wanted.groupId)),read('student',path('summaries',id,wanted.groupId))]);
 const submission=summary?await getSubmissionFor('student',id,wanted.groupId,summary.revision):null;
 return {room,profile,group,writer,summary,submission};
}
export async function claimWriter(id,gId){
 id=roomId(id);gId=groupId(gId);const user=await ensureStudent();const number=await read('student',path('registrations',id,user.uid));const profile=await read('student',path('members',id,number));
 const value={uid:user.uid,number:profile.number,name:profile.name};
 const result=await operation('student',db=>sdk.runTransaction(sdk.ref(db,path('writers',id,gId)),old=>{if(old&&old.uid!==user.uid)return;return old||value;},{applyLocally:false}));
 if(!result.committed)fail('writer/occupied','이미 기록이가 있어요. 선생님 화면에서 기록이를 바꿀 수 있어요.');return result.snapshot.val();
}
function watch(role,locations,combine,onData,onError){
 const i=instance(role);let stopped=false,offs=[],values={},seen=new Set();
 const stopListeners=()=>{if(!offs.length)return;for(const off of offs)off();active[role]-=offs.length;offs=[];idle(role);};
 const start=()=>{if(stopped||offs.length||document.hidden)return;sdk.goOnline(i.db);clearTimeout(idleTimers[role]);
  offs=locations.map(([key,p])=>{active[role]++;return sdk.onValue(sdk.ref(i.db,p),snapshot=>{values[key]=snapshot.val();seen.add(key);if(seen.size===locations.length)onData(clone(combine(values)));},error=>{if(stopped)return;stopped=true;document.removeEventListener('visibilitychange',visibility);stopListeners();onError?.(error);});});
 };
 const visibility=()=>{if(document.hidden)stopListeners();else start();};document.addEventListener('visibilitychange',visibility);start();
 return ()=>{if(stopped)return;stopped=true;document.removeEventListener('visibilitychange',visibility);stopListeners();};
}
export function watchTeacher(id,onData,onError){id=roomId(id);requireTeacher();return watch('teacher',['public','groups','summaries','members','writers','opinionHeads'].map(part=>[part,path(part,id)]),v=>({room:v.public,groups:v.groups||{},summaries:v.summaries||{},members:v.members||{},writers:v.writers||{},opinionHeads:v.opinionHeads||{}}),onData,onError);}
export function watchBoard(id,onData,onError){id=roomId(id);requireTeacher();return watch('teacher',['public','groups','summaries','opinionHeads'].map(part=>[part,path(part,id)]),v=>({room:v.public,groups:v.groups||{},summaries:v.summaries||{},opinionHeads:v.opinionHeads||{}}),onData,onError);}
export function watchStudent(id,gId,onData,onError){id=roomId(id);gId=groupId(gId);return watch('student',[
 ['room',path('public',id)],['group',path('groups',id,gId)],['writer',path('writers',id,gId)],['summary',path('summaries',id,gId)],['opinions',path('opinions',id,gId)]
 ],v=>v,onData,onError);}
async function getSubmissionFor(role,id,gId,revision){const key='submission:'+role+':'+id+':'+gId,old=caches.get(key);if(old&&revision!=null&&old.revision===revision)return clone(old);const value=await read(role,path('submissions',id,gId));caches.set(key,clone(value));return value;}
export async function getSubmission(id,gId,revision,role='teacher'){id=roomId(id);gId=groupId(gId);return getSubmissionFor(role,id,gId,revision);}
export async function submit(id,gId,payload,expectedRevision=0){
 id=roomId(id);gId=groupId(gId);const user=await ensureStudent(),checked=validateSubmission(payload);if(!checked.ok)fail('submission/invalid',checked.errors[0]);
 const number=await read('student',path('registrations',id,user.uid)),profile=await read('student',path('members',id,number));
 const ownOpinion=await read('student',path('opinions',id,gId,number));if(!ownOpinion||ownOpinion.cinemaId!==checked.draft.cinemaId)fail('opinion/required','먼저 질문 하나를 골라 내 의견을 게시해 주세요.');
 const previous=await getSubmissionFor('student',id,gId);
 if((previous?.revision||0)!==expectedRevision)fail('submission/conflict','모둠의 제출 내용이 바뀌었어요. 제출된 정리를 불러온 뒤 수정해 주세요. 이 기기의 메모는 보관돼요.');
 const d=checked.draft,revision=expectedRevision+1,submittedAt=Date.now();
 const record={cinemaId:d.cinemaId,introduction:d.introduction.trim(),meaning:d.meaning.trim(),revision,submittedAt,submittedBy:user.uid,submittedName:profile.name,submittedNumber:profile.number};
 const preview=v=>String(v).replace(/\s+/g,' ').trim();
 const summary={groupId:gId,groupName:`${Number(gId.slice(1))}모둠`,cinemaId:d.cinemaId,revision,submittedAt,submittedName:profile.name,submittedNumber:profile.number,introductionPreview:preview(d.introduction).slice(0,90),meaningPreview:preview(d.meaning).slice(0,100)};
 await update('student',{[path('submissions',id,gId)]:record,[path('summaries',id,gId)]:summary});caches.set('submission:student:'+id+':'+gId,clone(record));return record;
}
export async function setRoomOpen(id,open){id=roomId(id);requireTeacher();await write('teacher',path('public',id,'open'),!!open);}
export async function setBoard(id,changes){id=roomId(id);requireTeacher();const allowed=['slide','reveal','presentingGroup','timerEndsAt','phase'];const updates={};for(const key of allowed)if(Object.hasOwn(changes,key))updates[path('public',id,key)]=changes[key];await update('teacher',updates);}
export async function setPresentation(id,gId){if(gId!=='')groupId(gId);await setBoard(id,{slide:11,presentingGroup:gId,phase:'present',reveal:0});}
export async function resetWriter(id,gId){id=roomId(id);groupId(gId);requireTeacher();await write('teacher',path('writers',id,gId),null);}
export async function resetStudent(id,number){id=roomId(id);requireTeacher();const profile=await read('teacher',path('members',id,String(number)));if(!profile)return;const changes={[path('members',id,String(number))]:null,[path('registrations',id,profile.uid)]:null,[path('opinions',id,profile.groupId,String(number))]:null,[path('opinionHeads',id,profile.groupId,String(number))]:null};const w=await read('teacher',path('writers',id,profile.groupId));if(w?.uid===profile.uid)changes[path('writers',id,profile.groupId)]=null;await update('teacher',changes);}
export async function deleteRoom(id){id=roomId(id);requireTeacher();await update('teacher',Object.fromEntries(['public','groups','members','registrations','writers','opinions','opinionHeads','submissions','summaries','meta'].map(part=>[path(part,id),null])));for(const key of caches.keys())if(key.includes(id))caches.delete(key);}

export async function assignCinema(id,gId,cinemaId){id=roomId(id);groupId(gId);requireTeacher();if(cinemaId!==''&&!CINEMA_IDS.includes(cinemaId))fail('assignment/invalid','영화관을 확인해 주세요.');await write('teacher',path('groups',id,gId,'cinemaId'),cinemaId);}

export async function getRoster(id){id=roomId(id);requireTeacher();const [members,writers]=await Promise.all([read('teacher',path('members',id)),read('teacher',path('writers',id))]);return {members:members||{},writers:writers||{}};}

export async function getOpinions(id,gId,role='teacher'){id=roomId(id);groupId(gId);return await read(role,path('opinions',id,gId))||{};}
export async function postOpinion(id,gId,input){
 id=roomId(id);groupId(gId);const user=await ensureStudent(),check=validateOpinion(input);if(!check.ok)fail('opinion/invalid',check.errors[0]);
 const number=await read('student',path('registrations',id,user.uid)),profile=await read('student',path('members',id,number));
 const old=await read('student',path('opinions',id,gId,number));
 const revision=(old?.revision||0)+1,postedAt=Date.now(),d=check.opinion;
 const record={...d,text:d.text.trim(),uid:user.uid,number:profile.number,name:profile.name,revision,postedAt};
 const head={cinemaId:d.cinemaId,questionId:d.questionId,revision,postedAt};
 await update('student',{[path('opinions',id,gId,number)]:record,[path('opinionHeads',id,gId,number)]:head});return record;
}
