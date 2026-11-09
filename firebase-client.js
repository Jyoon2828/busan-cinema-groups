/* Firebase traffic is limited to explicit submissions and small classroom signals. */
import { validateSubmission, defaultsRoomGroups, ROOM_TTL_MS, GROUP_IDS, CINEMA_IDS } from './model.js';
const NS='cinemaGroupsV1', SDK='https://www.gstatic.com/firebasejs/12.19.0/';
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
   const appName='busan-cinema-groups-'+role;
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
function assignmentsOnly(assignments){const groups=defaultsRoomGroups(assignments);for(const g of Object.values(groups))if(g.cinemaId!==''&&!CINEMA_IDS.includes(g.cinemaId))fail('assignment/invalid','배정할 영화관을 확인해 주세요.');return groups;}
export async function createRoom({title='부산 영화관 모둠 탐험',assignments}={}){
 const user=requireTeacher(),groups=assignmentsOnly(assignments),createdAt=Date.now(),expiresAt=createdAt+ROOM_TTL_MS;
 const id=randomCode();
 await write('teacher',path('meta',id),{ownerUid:user.uid,createdAt,expiresAt});
 const meta={title:String(title).trim().slice(0,80)||'부산 영화관 모둠 탐험',open:true,phase:'research',presentingGroup:'',createdAt,expiresAt};
 for(const g of Object.values(groups))g.joinToken=token();
 try{await update('teacher',{[path('public',id)]:meta,[path('groups',id)]:groups});}catch(e){await update('teacher',{[path('meta',id)]:null}).catch(()=>{});throw e;}
 caches.set('groups:'+id,clone(groups));return {roomId:id,meta:clone(meta),groups:clone(groups)};
}
export async function getRoom(id){id=roomId(id);await ensureStudent();const meta=await read('student',path('public',id));if(!meta)fail('room/missing','수업을 찾지 못했어요. 수업 코드를 확인해 주세요.');return {...meta,roomId:id};}
export async function getTeacherRoom(id){id=roomId(id);requireTeacher();const [privateMeta,meta,groups]=await Promise.all([read('teacher',path('meta',id)),read('teacher',path('public',id)),read('teacher',path('groups',id))]);if(!privateMeta||!meta)fail('room/missing','이 계정의 수업을 찾지 못했어요.');caches.set('groups:'+id,clone(groups||{}));return {meta:{...meta,roomId:id},groups:groups||{}};}
export async function updateAssignments(id,assignments){id=roomId(id);requireTeacher();const wanted=assignmentsOnly(assignments),updates={};for(const g of GROUP_IDS)updates[path('groups',id,g,'cinemaId')]=wanted[g].cinemaId;await update('teacher',updates);const groups=caches.get('groups:'+id);if(groups)for(const g of GROUP_IDS)groups[g].cinemaId=wanted[g].cinemaId;}
export async function joinGroup(id,gId,joinToken){
 id=roomId(id);gId=groupId(gId);if(!/^[A-Za-z0-9_-]{43,128}$/.test(String(joinToken||'')))fail('group/link','선생님이 보내 준 모둠 링크를 열어 주세요.');
 const user=await ensureStudent(),room=await getRoom(id);
 try{await write('student',path('members',id,gId),{uid:user.uid,token:joinToken,joinedAt:Date.now()});}catch(e){const error=new Error('이 모둠은 다른 대표 기기가 사용 중이거나 링크가 바뀌었어요. 선생님께 대표 기기 재설정을 요청해 주세요.');error.code=e.code||'group/claim';throw error;}
 const group=await read('student',path('groups',id,gId));const submission=await getSubmissionFor('student',id,gId);return {room,group:{id:gId,name:group.name,cinemaId:group.cinemaId},submission};
}
function watch(role,locations,combine,onData,onError){
 const i=instance(role);let stopped=false,offs=[],values={},seen=new Set();
 const stopListeners=()=>{if(!offs.length)return;for(const off of offs)off();active[role]-=offs.length;offs=[];idle(role);};
 const start=()=>{if(stopped||offs.length||document.hidden)return;sdk.goOnline(i.db);clearTimeout(idleTimers[role]);
  offs=locations.map(([key,p])=>{active[role]++;return sdk.onValue(sdk.ref(i.db,p),snapshot=>{values[key]=snapshot.val();seen.add(key);if(seen.size===locations.length)onData(clone(combine(values)));},error=>{stopped=true;document.removeEventListener('visibilitychange',visibility);stopListeners();onError?.(error);});});
 };
 const visibility=()=>{if(document.hidden)stopListeners();else start();};document.addEventListener('visibilitychange',visibility);start();
 return ()=>{if(stopped)return;stopped=true;document.removeEventListener('visibilitychange',visibility);stopListeners();};
}
export function watchRoom(id,onData,onError){id=roomId(id);requireTeacher();return watch('teacher',[['room',path('public',id)]],v=>v.room,onData,onError);}
export function watchGroup(id,gId,onData,onError){id=roomId(id);gId=groupId(gId);return watch('student',[['group',path('groups',id,gId)],['room',path('public',id)]],v=>({group:v.group?{id:gId,name:v.group.name,cinemaId:v.group.cinemaId}:null,roomOpen:!!v.room?.open,phase:v.room?.phase||'research',presentingGroup:v.room?.presentingGroup||''}),onData,onError);}
export function watchSummaries(id,onData,onError){id=roomId(id);requireTeacher();return watch('teacher',[['summaries',path('summaries',id)]],v=>v.summaries||{},onData,onError);}
async function getSubmissionFor(role,id,gId,revision){const key='submission:'+role+':'+id+':'+gId,old=caches.get(key);if(old&&revision!=null&&old.revision===revision)return clone(old);const value=await read(role,path('submissions',id,gId));caches.set(key,clone(value));return value;}
export async function getSubmission(id,gId,revision){id=roomId(id);gId=groupId(gId);return getSubmissionFor(teacherUser()?'teacher':'student',id,gId,revision);}
export async function submit(id,gId,payload){
 id=roomId(id);gId=groupId(gId);const user=await ensureStudent(),checked=validateSubmission(payload);if(!checked.ok)fail('submission/invalid',checked.errors.join('\n'));
 const key='submission:student:'+id+':'+gId;let previous=caches.get(key);if(previous===undefined)previous=await getSubmissionFor('student',id,gId);
 const revision=(previous?.revision||0)+1,submittedAt=Date.now(),d=checked.draft;
 const record={cinemaId:d.cinemaId,feature:d.feature,help:d.help,evidenceIds:d.evidenceIds,meaning:d.meaning,revision,submittedAt,submittedBy:user.uid};
 const preview=s=>String(s).replace(/\s+/g,' ').trim();
 const summary={groupId:gId,groupName:`${Number(gId.slice(1))}모둠`,cinemaId:d.cinemaId,revision,submittedAt,featurePreview:preview(d.feature).slice(0,90),meaningPreview:preview(d.meaning.final).slice(0,120)};
 await update('student',{[path('submissions',id,gId)]:record,[path('summaries',id,gId)]:summary});caches.set(key,clone(record));return {revision,submittedAt};
}
export async function setRoomOpen(id,open,phase){id=roomId(id);requireTeacher();const updates={[path('public',id,'open')]:!!open};if(phase!=null){if(!['research','meaning','present'].includes(phase))fail('phase/invalid','활동 단계를 확인해 주세요.');updates[path('public',id,'phase')]=phase;}await update('teacher',updates);}
export async function setPresentation(id,gId){id=roomId(id);requireTeacher();if(gId!=='')groupId(gId);const updates={[path('public',id,'presentingGroup')]:gId};if(gId)updates[path('public',id,'phase')]='present';await update('teacher',updates);}
export async function resetGroup(id,gId){id=roomId(id);gId=groupId(gId);requireTeacher();const joinToken=token();await update('teacher',{[path('groups',id,gId,'joinToken')]:joinToken,[path('members',id,gId)]:null});const groups=caches.get('groups:'+id);if(groups?.[gId])groups[gId].joinToken=joinToken;return joinToken;}
export async function deleteRoom(id){id=roomId(id);requireTeacher();await update('teacher',Object.fromEntries(['public','groups','members','submissions','summaries','meta'].map(part=>[path(part,id),null])));for(const key of caches.keys())if(key.includes(id))caches.delete(key);}
// Six small assignment/link records; never submission bodies or photos.
export function watchGroups(id,onData,onError){id=roomId(id);requireTeacher();return watch('teacher',[['groups',path('groups',id)]],v=>v.groups||{},groups=>{caches.set('groups:'+id,clone(groups));onData(groups);},onError);}
