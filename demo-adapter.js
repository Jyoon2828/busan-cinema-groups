import { CINEMA_IDS, GROUP_IDS, ROOM_TTL_MS, defaultsRoomGroups, validateSubmission } from './model.js';

export const isDemo = true;
const DB_KEY = 'cinema-groups-demo-v1';
const TEACHER_UID_KEY = 'cinema-groups-demo-teacher-uid';
const TEACHER_AUTH_KEY = 'cinema-groups-demo-teacher-auth';
const STUDENT_UID_KEY = 'cinema-groups-demo-student-uid';
const callbacks = new Set();
const cache = new Map();
let memoryDB = { rooms: {} };
let memoryTeacherUid = '', memoryStudentUid = '', activeTeacher = null;
let channel;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('cinema-groups-demo-changes');
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
  if (room.claims?.[groupId]?.uid !== uid('student')) fail('모둠 입장 링크로 먼저 들어와 주세요.', 'permission-denied');
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
export async function createRoom({ title = '', assignments } = {}) {
  const teacher = teacherUser();
  if (!teacher) fail('선생님으로 먼저 들어와 주세요.', 'auth-required');
  const data = db();
  let roomId;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  do {
    const bytes = new Uint8Array(8); globalThis.crypto.getRandomValues(bytes);
    roomId = [...bytes].map(value => alphabet[value % alphabet.length]).join('');
  } while (data.rooms[roomId]);
  const now = Date.now();
  const meta = { title: String(title || '우리 지역 영화관 탐험').slice(0, 60), open: true, phase: 'research', presentingGroup: '', createdAt: now, expiresAt: now + ROOM_TTL_MS };
  const groups = defaultsRoomGroups(assignments);
  for (const group of Object.values(groups)) group.joinToken = random(32);
  data.rooms[roomId] = { ownerUid: teacher.uid, meta, groups, claims: {}, submissions: {}, summaries: {} };
  commit(data);
  return { roomId, meta: clone(meta), groups: clone(groups) };
}
export async function getRoom(roomId) { return clone(getLiveRoom(db(), roomId).room.meta); }
export async function getTeacherRoom(roomId) {
  const { room } = getLiveRoom(db(), roomId); requireTeacher(room);
  return { meta: clone(room.meta), groups: clone(room.groups) };
}
export async function updateAssignments(roomId, assignments) {
  const data = db(), { room } = getLiveRoom(data, roomId); requireTeacher(room);
  for (const groupId of GROUP_IDS) {
    const cinemaId = assignments?.[groupId];
    if (cinemaId !== '' && !CINEMA_IDS.includes(cinemaId)) fail('배정할 영화관을 확인해 주세요.', 'invalid-assignment');
  }
  for (const groupId of GROUP_IDS) room.groups[groupId].cinemaId = assignments[groupId];
  commit(data);
}
export async function joinGroup(roomId, groupId, token) {
  const data = db(), { room } = getLiveRoom(data, roomId);
  if (!GROUP_IDS.includes(groupId)) fail('모둠을 찾지 못했어요.', 'group-not-found');
  const group = room.groups[groupId], student = await ensureStudent();
  if (group.joinToken !== token) fail('모둠 입장 링크가 바뀌었어요. 선생님께 새 링크를 받아 주세요.', 'invalid-token');
  const claimed = room.claims?.[groupId];
  if (claimed && claimed.uid !== student.uid) fail('다른 기기에서 작성 중인 모둠이에요. 대표 기기를 이용하거나 선생님께 입장 초기화를 부탁하세요.', 'group-in-use');
  if (!claimed) {
    if (!room.meta.open) fail('지금은 모둠 입장이 닫혀 있어요.', 'room-closed');
    room.claims ||= {}; room.claims[groupId] = { uid: student.uid, token };
    commit(data);
  }
  return { room: clone(room.meta), group: publicGroup(group), submission: clone(room.submissions?.[groupId] || null) };
}
export function watchGroup(roomId, groupId, onValue, onError) {
  return watch(() => {
    const { room } = getLiveRoom(db(), roomId), group = requireGroup(room, groupId);
    return { group: publicGroup(group), roomOpen: room.meta.open, phase: room.meta.phase, presentingGroup: room.meta.presentingGroup || '' };
  }, onValue, onError);
}
export async function submit(roomId, groupId, payload) {
  const data = db(), { id, room } = getLiveRoom(data, roomId), group = requireGroup(room, groupId);
  if (!room.meta.open) fail('제출이 닫혀 있어요. 선생님께 확인해 주세요.', 'room-closed');
  const validation = validateSubmission(payload);
  if (!validation.ok) fail(validation.errors.join('\n'), 'incomplete-submission');
  if (group.cinemaId && validation.draft.cinemaId !== group.cinemaId) fail('선생님이 지정한 영화관으로 조사 내용을 정리해 주세요.', 'assignment-mismatch');
  const revision = (room.submissions?.[groupId]?.revision || 0) + 1, submittedAt = Date.now();
  const draft = validation.draft;
  const submission = { cinemaId: draft.cinemaId, feature: draft.feature, help: draft.help, evidenceIds: draft.evidenceIds, meaning: draft.meaning, revision, submittedAt };
  room.submissions ||= {}; room.summaries ||= {};
  room.submissions[groupId] = submission;
  room.summaries[groupId] = { groupId, groupName: group.name, cinemaId: draft.cinemaId, revision, submittedAt, featurePreview: draft.feature.trim().slice(0, 90), meaningPreview: draft.meaning.final.trim().slice(0, 120) };
  forgetRoomCache(id);
  commit(data);
  return { revision, submittedAt };
}
export function watchSummaries(roomId, onValue, onError) {
  return watch(() => { const { room } = getLiveRoom(db(), roomId); requireTeacher(room); return room.summaries || {}; }, onValue, onError);
}
export async function getSubmission(roomId, groupId, revision) {
  const { id, room } = getLiveRoom(db(), roomId); requireGroup(room, groupId, true);
  const value = room.submissions?.[groupId] || null;
  if (!value) return null;
  const key = `${id}:${groupId}:${value.revision}`;
  if (revision === value.revision && cache.has(key)) return clone(cache.get(key));
  cache.set(key, clone(value));
  return clone(value);
}
export async function setRoomOpen(roomId, open, phase) {
  const data = db(), { room } = getLiveRoom(data, roomId); requireTeacher(room);
  room.meta.open = !!open;
  if (phase !== undefined) {
    if (!['research', 'meaning', 'present'].includes(phase)) fail('활동 단계를 확인해 주세요.', 'invalid-phase');
    room.meta.phase = phase;
  }
  commit(data);
}
export async function resetGroup(roomId, groupId) {
  const data = db(), { room } = getLiveRoom(data, roomId); requireTeacher(room);
  if (!GROUP_IDS.includes(groupId)) fail('모둠을 찾지 못했어요.', 'group-not-found');
  const token = random(32);
  room.groups[groupId].joinToken = token;
  delete room.claims[groupId];
  commit(data);
  return token;
}
export async function deleteRoom(roomId) {
  const data = db(), { id, room } = getLiveRoom(data, roomId); requireTeacher(room);
  delete data.rooms[id]; forgetRoomCache(id); commit(data);
}

export function watchRoom(roomId, onValue, onError) {
  return watch(() => clone(getLiveRoom(db(), roomId).room.meta), onValue, onError);
}
export async function setPresentation(roomId, groupId = '') {
  const data = db(), { room } = getLiveRoom(data, roomId); requireTeacher(room);
  if (groupId !== '' && !GROUP_IDS.includes(groupId)) fail('발표할 모둠을 확인해 주세요.', 'group-not-found');
  room.meta.presentingGroup = groupId;
  if (groupId) room.meta.phase = 'present';
  commit(data);
}

export function watchGroups(roomId, onValue, onError) {
  return watch(() => { const { room } = getLiveRoom(db(), roomId); requireTeacher(room); return room.groups || {}; }, onValue, onError);
}
