export const DISCUSSION_QUESTIONS = [
 {id:'joy',label:'즐거운 경험',text:'영화관은 우리에게 어떤 즐거운 경험을 주나요?'},
 {id:'together',label:'함께 보는 가치',text:'다른 사람들과 함께 영화를 보고 생각을 나누면 어떤 점이 좋을까요?'},
 {id:'local',label:'우리 지역의 문화 공간',text:'우리 지역에 영화관이 있어서 좋은 점은 무엇인가요?'}
];
export const CINEMA_IDS = ['lotte','dureraum','corner','millak','centum','yeongdo'];
export const GROUP_IDS = ['g1','g2','g3','g4','g5','g6'];
export const ROOM_TTL_MS=7*24*60*60*1000;
export const MAX_STUDENTS=40, LESSON_SLIDES=13;
export const INTRO_LIMIT=120, MEANING_LIMIT=100, OPINION_LIMIT=180;
const clean=(v,max)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,max):'';
export function normalizeProfile(input={}){
 const number=String(input.number||'').trim().replace(/^0+/,'');
 const name=clean(input.name,20).trim();
 if(!GROUP_IDS.includes(input.groupId))throw new Error('우리 모둠을 골라 주세요.');
 if(!/^(?:[1-9]|[12][0-9]|3[0-9]|40)$/.test(number))throw new Error('번호는 1부터 40까지 입력해 주세요.');
 if(!name)throw new Error('이름을 입력해 주세요.');
 return {groupId:input.groupId,number,name};
}
export function freshDraft(cinemaId=''){return {version:3,cinemaId:CINEMA_IDS.includes(cinemaId)?cinemaId:'',introduction:'',meaning:''};}
export function sanitizeDraft(input={}){const draft=freshDraft(input.cinemaId);draft.introduction=clean(input.introduction,INTRO_LIMIT);draft.meaning=clean(input.meaning,MEANING_LIMIT);return draft;}
export function validateSubmission(input){const draft=sanitizeDraft(input),errors=[];if(!draft.cinemaId)errors.push('선생님이 지정한 영화관을 확인해 주세요.');if(!draft.introduction.trim())errors.push('영화관 소개를 간단히 정리해 주세요.');if(!draft.meaning.trim())errors.push('모둠이 정한 영화관의 의미를 한 문장으로 써 주세요.');return {ok:!errors.length,errors,draft};}
export function freshOpinion(cinemaId=''){return {cinemaId:CINEMA_IDS.includes(cinemaId)?cinemaId:'',questionId:'',text:''};}
export function sanitizeOpinion(input={}){return {cinemaId:CINEMA_IDS.includes(input.cinemaId)?input.cinemaId:'',questionId:DISCUSSION_QUESTIONS.some(q=>q.id===input.questionId)?input.questionId:'',text:clean(input.text,OPINION_LIMIT)};}
export function validateOpinion(input){const opinion=sanitizeOpinion(input),errors=[];if(!opinion.cinemaId)errors.push('선생님이 지정한 영화관을 확인해 주세요.');if(!opinion.questionId)errors.push('세 질문 중 하나를 골라 주세요.');if(!opinion.text.trim())errors.push('고른 질문에 대한 내 생각을 써 주세요.');return {ok:!errors.length,errors,opinion};}
export function defaultsRoomGroups(assignments={}){return Object.fromEntries(GROUP_IDS.map((id,i)=>[id,{id,name:`${i+1}모둠`,cinemaId:CINEMA_IDS.includes(assignments[id])?assignments[id]:''}]));}

// Realtime Database may return numbered children as arrays with null gaps.
// Keep the original student-number keys; never compact or renumber them.
export function normalizeRealtimeValue(value){
 if(value===null||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([,child])=>child!==null&&child!==undefined).map(([key,child])=>[key,normalizeRealtimeValue(child)]));
}
export function recordValues(value){return Object.values(value&&typeof value==='object'?value:{}).filter(record=>record!==null&&typeof record==='object'&&!Array.isArray(record));}
