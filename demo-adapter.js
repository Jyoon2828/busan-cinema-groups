import { CINEMA_IDS, GROUP_IDS, ROOM_TTL_MS, defaultsRoomGroups, validateSubmission, normalizeProfile, validateOpinion } from './model.js';

export const isDemo = true;
const DB_KEY = 'cinema-class-v3-demo-v1';
const TEACHER_UID_KEY = 'cinema-class-v3-demo-teacher-uid';
const TEACHER_AUTH_KEY = 'cinema-class-v3-demo-teacher-auth';
const STUDENT_UID_KEY = 'cinema-class-v3-demo-student-uid';
const callbacks = new Set();
const cache = new Map();
let memoryDB = { rooms: {} };
let memoryTeacherUid = '', memoryStudentUid = '', activeTeacher = null;
let channel;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('cinema-class-v3-demo-changes');
    channel.onmessage = () => emit();
    channel.unref?.();
  }
  globalThis.addEventListener?.('storage', event => { if (event.key === DB_KEY) emit(); });
} catch { /* The local preview also works without cross-tab support. */ }

function storageGet(storage, key) { try { return globalThis[storage]?.getItem(key) || ''; } catch { return ''; } }
function storageSet(storage, key, value) { try { globalThis[storage]?.setItem(key, value); } catch { /* In-memory preview remains usable. */ } }
function random(bytes = 24) {
  const values = new Uint8Array(bytes);
  if (!globalThis.crypto?.getRandomValues) throw new Error('이 브라우저에서는 입장 링크를 만들 수 없어요. 최신 브라우저를 사용해 주세요.');
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, value => value.toString(16).padStart(2, '0')).join('');
}
function uid(role) {
  if (role === 'teacher') {
    memoryTeacherUid ||= storageGet('localStorage', TEACHER_UID_KEY) || `demo-teacher-${random(12)}`;
    storageSet('localStorage', TEACHER_UID_KEY, memoryTeacherUid);
    return memoryTeacherUid;
  }
  memoryStudentUid ||= storageGet('sessionStorage', STUDENT_UID_KEY) || `demo-student-${random(12)}`;
  storageSet('sessionStorage', STUDENT_UID_KEY, memoryStudentUid);
  return memoryStudentUid;
}
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
function db() {
  try {
    const raw = storageGet('localStorage', DB_KEY);
    const parsed = raw ? JSON.parse(raw) : memoryDB;
    if (parsed && typeof parsed === 'object' && parsed.rooms && !Array.isArray(parsed.rooms)) return parsed;
  } catch { /* A fresh local preview can replace damaged demo data. */ }
  return clone(memoryDB);
}
function commit(value) {
  memoryDB = clone(value);
  storageSet('localStorage', DB_KEY, JSON.stringify(value));
  emit();
  try { channel?.postMessage({ changed: Date.now() }); } catch { /* No shared preview channel. */ }
}
function emit() { for (const callback of callbacks) callback(); }
function fail(message, code) { const error = new Error(message); error.code = code; throw error; }
function getLiveRoom(data, roomId) {
  const id = String(roomId || '').trim().toUpperCase();
  const room = data.rooms[id];
  if (!room) fail('수업을 찾지 못했어요. 입장 링크를 확인해 주세요.', 'room-not-found');
  if (room.meta.expiresAt <= Date.now()) fail('수업의 보관 기간이 끝났어요. 선생님께 새 수업 링크를 받아 주세요.', 'room-expired');
  return { id, room };
}
function requireTeacher(room) {
  const user = teacherUser();
  if (!user || room.ownerUid !== user.uid) fail('이 수업을 만든 선생님만 사용할 수 있어요.', 'permission-denied');
  return user;
}
function requireGroup(room, groupId, allowTeacher = false) {
  if (!GROUP_IDS.includes(groupId) || !room.groups[groupId]) fail('모둠을 찾지 못했어요.', 'group-not-found');
  if (allowTeacher && teacherUser()?.uid === room.ownerUid) return room.groups[groupId];
  if (room.members?.[room.registrations?.[uid('student')]]?.groupId !== groupId) fail('먼저 모둠 · 번호 · 이름으로 입장해 주세요.', 'permission-denied');
  return room.groups[groupId];
}
const publicGroup = group => ({ id: group.id, name: group.name, cinemaId: group.cinemaId });
function watch(read, onValue, onError) {
  let active = true, last;
  const notify = () => {
    if (!active) return;
    try {
      const value = read();
      const serialized = JSON.stringify(value);
      if (serialized !== last) { last = serialized; onValue(clone(value)); }
    } catch (error) { onError?.(error); }
  };
  callbacks.add(notify);
  queueMicrotask(notify);
  return () => { active = false; callbacks.delete(notify); };
}
function forgetRoomCache(roomId) {
  for (const key of cache.keys()) if (key.startsWith(`${roomId}:`)) cache.delete(key);
}

export function isConfigured() { return true; }
export async function connect() { return { configured: true, demo: true }; }
export function teacherUser() {
  if (!activeTeacher && storageGet('localStorage', TEACHER_AUTH_KEY) === '1') activeTeacher = { uid: uid('teacher'), displayName: '미리보기 선생님' };
  return activeTeacher ? { ...activeTeacher } : null;
}
export async function teacherLogin() {
  activeTeacher = { uid: uid('teacher'), displayName: '미리보기 선생님' };
  storageSet('localStorage', TEACHER_AUTH_KEY, '1');
  return { ...activeTeacher };
}
export async function teacherLogout() {
  activeTeacher = null;
  storageSet('localStorage', TEACHER_AUTH_KEY, '0');
}
export async function ensureStudent() { return { uid: uid('student') }; }
export async function createRoom({title='우리 지역 영화관 탐험',assignments={}}={}){
 const teacher=teacherUser();if(!teacher)fail('교사로 로그인해 주세요.','auth-required');
 const data=db(),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let roomId;
 do{roomId=[...crypto.getRandomValues(new Uint8Array(8))].map(n=>alphabet[n%32]).join('');}while(data.rooms[roomId]);
 const now=Date.now(),meta={title:String(title).slice(0,60),open:true,phase:'research',slide:0,reveal:0,presentingGroup:'',timerEndsAt:0,createdAt:now,expiresAt:now+ROOM_TTL_MS},groups=defaultsRoomGroups(assignments);
 data.rooms[roomId]={ownerUid:teacher.uid,meta,groups,members:{},registrations:{},writers:{},opinions:{},opinionHeads:{},submissions:{},summaries:{}};commit(data);return {roomId,meta:clone(meta),groups:clone(groups)};
}
export async function getRoom(id){return clone(getLiveRoom(db(),id).room.meta);}
export async function getTeacherRoom(id){const {room}=getLiveRoom(db(),id);requireTeacher(room);return {meta:clone(room.meta),groups:clone(room.groups)};}
export async function updateAssignments(id,assignments){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);for(const g of GROUP_IDS){if(assignments[g]!==''&&!CINEMA_IDS.includes(assignments[g]))fail('영화관을 확인해 주세요.','invalid');room.groups[g].cinemaId=assignments[g];}commit(data);}
export async function joinStudent(id,input){
 const wanted=normalizeProfile(input),data=db(),{room}=getLiveRoom(data,id),student=await ensureStudent();
 const oldNumber=room.registrations[student.uid];let profile;
 if(oldNumber){profile=room.members[oldNumber];if(['number','groupId','name'].some(k=>profile[k]!==wanted[k]))fail('이 기기에 다른 입장 정보가 남아 있어요. 선생님께 입장 초기화를 부탁하세요.','entry/already');}
 else{if(!room.meta.open)fail('입장이 닫혀 있어요.','room/closed');if(room.members[wanted.number])fail('이미 사용 중인 번호예요. 번호를 확인해 주세요.','entry/occupied');profile={...wanted,uid:student.uid,joinedAt:Date.now()};room.members[wanted.number]=profile;room.registrations[student.uid]=wanted.number;commit(data);}
 return clone({room:room.meta,profile,group:room.groups[wanted.groupId],writer:room.writers[wanted.groupId]||null,summary:room.summaries[wanted.groupId]||null,submission:room.submissions[wanted.groupId]||null});
}
export async function claimWriter(id,g){const data=db(),{room}=getLiveRoom(data,id);requireGroup(room,g);const user=uid('student'),profile=room.members[room.registrations[user]];if(!room.meta.open)fail('제출이 닫혀 있어요.','room/closed');if(room.writers[g]&&room.writers[g].uid!==user)fail('이미 기록이가 있어요.','writer/occupied');room.writers[g]={uid:user,number:profile.number,name:profile.name};commit(data);return clone(room.writers[g]);}
const teacherState=id=>{const {room}=getLiveRoom(db(),id);requireTeacher(room);return {room:room.meta,groups:room.groups,summaries:room.summaries,members:room.members,writers:room.writers,opinionHeads:room.opinionHeads};};
export function watchTeacher(id,onData,onError){return watch(()=>teacherState(id),onData,onError);}
export function watchBoard(id,onData,onError){return watch(()=>{const {room,groups,summaries,opinionHeads}=teacherState(id);return {room,groups,summaries,opinionHeads};},onData,onError);}
export function watchStudent(id,g,onData,onError){return watch(()=>{const {room}=getLiveRoom(db(),id);requireGroup(room,g);return {room:room.meta,group:room.groups[g],writer:room.writers[g]||null,summary:room.summaries[g]||null,opinions:room.opinions[g]||{}};},onData,onError);}
export async function getSubmission(id,g){const {room}=getLiveRoom(db(),id);requireGroup(room,g,true);return clone(room.submissions[g]||null);}
export async function submit(id,g,input,expectedRevision=0){
 const data=db(),{room}=getLiveRoom(data,id);requireGroup(room,g);if(!room.meta.open)fail('제출이 닫혀 있어요.','room/closed');if(room.writers[g]?.uid!==uid('student'))fail('모둠의 기록이가 제출해 주세요.','writer/required');if(room.opinions[g]?.[room.registrations[uid('student')]]?.cinemaId!==input.cinemaId)fail('먼저 질문 하나를 골라 내 의견을 게시해 주세요.','opinion/required');
 const check=validateSubmission(input);if(!check.ok)fail(check.errors[0],'submission/invalid');if(room.groups[g].cinemaId!==check.draft.cinemaId)fail('선생님이 지정한 영화관을 확인해 주세요.','assignment/changed');
 if((room.submissions[g]?.revision||0)!==expectedRevision)fail('제출된 모둠 정리를 먼저 불러와 주세요.','submission/conflict');
 const profile=room.members[room.registrations[uid('student')]],{version,...draft}=check.draft,record={...draft,revision:expectedRevision+1,submittedAt:Date.now(),submittedBy:profile.uid,submittedName:profile.name,submittedNumber:profile.number};
 room.submissions[g]=record;room.summaries[g]={groupId:g,groupName:room.groups[g].name,cinemaId:draft.cinemaId,revision:record.revision,submittedAt:record.submittedAt,submittedName:profile.name,submittedNumber:profile.number,introductionPreview:draft.introduction.replace(/\s+/g,' ').slice(0,90),meaningPreview:draft.meaning.replace(/\s+/g,' ').slice(0,100)};
 commit(data);return clone(record);
}
export async function setRoomOpen(id,open){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);room.meta.open=!!open;commit(data);}
export async function setBoard(id,changes){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);Object.assign(room.meta,changes);commit(data);}
export async function setPresentation(id,g){await setBoard(id,{slide:11,presentingGroup:g,phase:'present',reveal:0});}
export async function resetWriter(id,g){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);delete room.writers[g];commit(data);}
export async function resetStudent(id,number){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);const profile=room.members[number];if(!profile)return;delete room.members[number];delete room.registrations[profile.uid];if(room.opinions[profile.groupId])delete room.opinions[profile.groupId][number];if(room.opinionHeads[profile.groupId])delete room.opinionHeads[profile.groupId][number];if(room.writers[profile.groupId]?.uid===profile.uid)delete room.writers[profile.groupId];commit(data);}
export async function deleteRoom(id){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);delete data.rooms[id];commit(data);}

export async function assignCinema(id,g,cinemaId){const data=db(),{room}=getLiveRoom(data,id);requireTeacher(room);if(cinemaId!==''&&!CINEMA_IDS.includes(cinemaId))fail('영화관을 확인해 주세요.','invalid');room.groups[g].cinemaId=cinemaId;commit(data);}

export async function getRoster(id){const value=teacherState(id);return clone({members:value.members,writers:value.writers});}

export async function getOpinions(id,g,role='teacher'){const {room}=getLiveRoom(db(),id);requireGroup(room,g,role==='teacher');return clone(room.opinions[g]||{});}
export async function postOpinion(id,g,input){const data=db(),{room}=getLiveRoom(data,id);requireGroup(room,g);if(!room.meta.open)fail('지금은 의견 게시가 닫혀 있어요.','room/closed');const check=validateOpinion(input);if(!check.ok)fail(check.errors[0],'opinion/invalid');if(room.groups[g].cinemaId!==check.opinion.cinemaId)fail('현재 지정된 영화관을 확인해 주세요.','assignment/changed');const profile=room.members[room.registrations[uid('student')]],old=room.opinions[g]?.[profile.number],postedAt=Date.now(),revision=(old?.revision||0)+1;const record={...check.opinion,text:check.opinion.text.trim(),uid:profile.uid,number:profile.number,name:profile.name,revision,postedAt};room.opinions[g]||={};room.opinions[g][profile.number]=record;room.opinionHeads[g]||={};room.opinionHeads[g][profile.number]={cinemaId:record.cinemaId,questionId:record.questionId,postedAt,revision};commit(data);return clone(record);}
