export const MEANING_TOPICS = [{"id": "joy", "label": "사람들에게 주는 즐거움", "tab": "즐거움 찾기", "questions": [{"id": "screen", "text": "큰 화면과 좋은 소리로 영화를 보면 어떤 즐거움을 느낄 수 있을까요?", "hint": "사진에서 본 상영관의 특징이나 인상 깊었던 장면을 떠올려요."}, {"id": "special", "text": "영화관에서 가족이나 친구와 보내는 시간은 왜 특별할까요?", "hint": "함께 영화를 보러 간 경험과 그때의 기분을 떠올려요."}, {"id": "story", "text": "영화 속 새로운 이야기나 인물의 삶을 만나면 무엇을 느끼거나 배울 수 있을까요?", "hint": "영화를 보며 처음 알게 된 일이나 마음에 남은 인물을 떠올려요."}]}, {"id": "together", "label": "함께 보는 경험의 가치", "tab": "함께 보는 가치", "questions": [{"id": "emotion", "text": "같은 장면을 함께 보며 웃거나 감동하면 어떤 점이 좋을까요?", "hint": "혼자 볼 때와 함께 볼 때의 느낌을 떠올려요."}, {"id": "thoughts", "text": "영화가 끝난 뒤 서로 다른 생각과 감상을 나누면 무엇을 알 수 있을까요?", "hint": "친구의 이야기를 듣고 새롭게 생각한 일이 있나요?"}, {"id": "consideration", "text": "여러 사람이 함께 영화를 즐기려면 어떤 배려가 필요할까요? 그 배려는 왜 중요할까요?", "hint": "나와 다른 관객이 모두 즐겁게 영화를 보는 모습을 떠올려요."}]}, {"id": "local", "label": "우리 지역의 문화 공간", "tab": "지역의 문화 공간", "questions": [{"id": "neighbours", "text": "영화관이 우리 지역 사람들이 함께 문화를 즐기는 장소가 되면 어떤 점이 좋을까요?", "hint": "영화관에서 어떤 사람들이 만나고 무엇을 함께 할 수 있을까요?"}, {"id": "opportunity", "text": "우리 지역에 영화관이 있으면 사람들이 어떤 문화 활동을 더 쉽게 경험할 수 있을까요?", "hint": "조사한 영화관의 공간과 프로그램에서 근거를 찾아요."}, {"id": "missing", "text": "우리 지역에서 영화관이 사라진다면, 어떤 즐거움과 함께하는 경험이 줄어들까요?", "hint": "사람들이 하던 활동과 함께 보내던 시간을 떠올려요."}]}];

export const MEANING_QUESTIONS = MEANING_TOPICS.flatMap(topic => topic.questions.map(question => ({ ...question, topic: topic.label, topicId: topic.id })));
export const QUESTION_KEYS = [...MEANING_QUESTIONS.map(question => question.id), 'final'];
export const CINEMA_IDS = ['lotte', 'dureraum', 'corner', 'millak', 'centum', 'yeongdo'];
export const GROUP_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TEXT_LIMIT = 700;
export const EVIDENCE_LIMIT = 6;
const text = value => typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, TEXT_LIMIT) : '';
const cinemaData = () => globalThis.CINEMA_DATA || globalThis.window?.CINEMA_DATA || [];

export function freshDraft(cinemaId = '') {
  return { version: 1, cinemaId: CINEMA_IDS.includes(cinemaId) ? cinemaId : '', feature: '', help: '', evidenceIds: [], meaning: Object.fromEntries(QUESTION_KEYS.map(key => [key, ''])) };
}

export function sanitizeDraft(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const draft = freshDraft(source.cinemaId);
  draft.feature = text(source.feature);
  draft.help = text(source.help);
  for (const key of QUESTION_KEYS) draft.meaning[key] = text(source.meaning?.[key]);
  const allowed = new Set(cinemaData().find(cinema => cinema.id === draft.cinemaId)?.evidence.map(item => item.id) || []);
  if (Array.isArray(source.evidenceIds)) draft.evidenceIds = [...new Set(source.evidenceIds.filter(id => typeof id === 'string' && allowed.has(id)))].slice(0, EVIDENCE_LIMIT);
  return draft;
}

export function validateSubmission(input) {
  const draft = sanitizeDraft(input);
  const errors = [];
  if (!CINEMA_IDS.includes(draft.cinemaId)) errors.push('조사할 영화관을 골라 주세요.');
  if (!draft.feature.trim()) errors.push('영화관에서 찾은 특징을 정리해 주세요.');
  if (!draft.evidenceIds.length) errors.push('특징을 확인한 자료를 근거로 한 개 이상 담아 주세요.');
  if (!draft.help.trim()) errors.push('사람들에게 주는 도움을 정리해 주세요.');
  if (!draft.meaning.final.trim()) errors.push('모둠에서 생각한 영화관의 의미를 한 문장으로 정리해 주세요.');
  return { ok: errors.length === 0, errors, draft };
}

export function defaultsRoomGroups(assignments) {
  const supplied = assignments && typeof assignments === 'object' && !Array.isArray(assignments);
  return Object.fromEntries(GROUP_IDS.map((id, index) => {
    const selected = supplied ? assignments[id] : CINEMA_IDS[index];
    return [id, { id, name: `${index + 1}모둠`, cinemaId: CINEMA_IDS.includes(selected) ? selected : '' }];
  }));
}
