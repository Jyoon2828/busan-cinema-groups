import { MEANING_QUESTIONS, sanitizeDraft } from './model.js';

const SOURCE_NOTE = '자료 출처: 영화관 공식 안내 및 공공기관 자료 참고';
const getData = () => globalThis.CINEMA_DATA || globalThis.window?.CINEMA_DATA || [];
const label = value => typeof value === 'string' ? value.slice(0, 80) : '';
const safeFilename = value => String(value || '모둠_영화관_탐험기록').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 110);

function reportContent({ roomTitle = '', groupName = '', submission } = {}) {
  const draft = sanitizeDraft(submission);
  const cinema = getData().find(item => item.id === draft.cinemaId);
  if (!cinema) throw new Error('저장할 영화관을 먼저 골라 주세요.');
  const selected = cinema.evidence.filter(item => draft.evidenceIds.includes(item.id));
  const selectedPhotos = selected.filter(item => item.kind === 'photo');
  const photos = selectedPhotos.length ? selectedPhotos.map(item => ({ src: item.image, alt: item.alt, title: item.title })) : [{ src: cinema.cover, alt: cinema.coverAlt, title: cinema.name + ' 대표 사진' }];
  return { roomTitle: label(roomTitle), groupName: label(groupName) || '우리 모둠', draft, cinema, selected, photos };
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function buildReportText(options) {
  const { roomTitle, groupName, draft, cinema, selected } = reportContent(options);
  const lines = ['우리 모둠 영화관 탐험 기록', [roomTitle, groupName].filter(Boolean).join(' · '), '', '[조사한 영화관]', cinema.name, '', '[우리가 찾은 특징]', draft.feature || '(미작성)', '', '[특징을 확인한 근거]', selected.map(item => item.title).join(' / ') || '(미선택)', '', '[사람들에게 주는 도움]', draft.help || '(미작성)', '', '[영화관의 의미를 생각한 모둠 토의]'];
  for (const question of MEANING_QUESTIONS) if (draft.meaning[question.id].trim()) lines.push(question.text, draft.meaning[question.id], '');
  lines.push('[한 문장으로 정리한 의미]', draft.meaning.final || '(미작성)', '', SOURCE_NOTE);
  return lines.join('\n');
}

export function saveJSON(data, filename = '모둠_영화관_탐험기록.json') {
  const requested = safeFilename(filename);
  const finalName = /\.json$/i.test(requested) ? requested : requested + '.json';
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), finalName);
  return finalName;
}
export const downloadJSON = saveJSON;

export async function downloadGroupPNG(options) {
  const report = reportContent(options);
  if (document.fonts?.ready) await document.fonts.ready;
  const photos = await Promise.all(report.photos.map(async photo => {
    const img = new Image();
    img.decoding = 'async';
    img.src = photo.src;
    try { await img.decode(); } catch { throw new Error('영화관 사진을 불러오지 못했어요. 사진이 표시되는지 확인한 뒤 다시 저장해 주세요.'); }
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('영화관 사진을 확인한 뒤 다시 저장해 주세요.');
    return { ...photo, img };
  }));
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이 브라우저에서는 기록 이미지를 만들 수 없어요.');
  const width = 1400, pad = 86, inner = width - pad * 2, commands = [];
  let y = 0;
  const font = (size, weight = 400) => `${weight} ${size}px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  function wrap(value, max, size, weight = 400) {
    ctx.font = font(size, weight);
    const result = [];
    for (const part of String(value || '아직 기록하지 않았어요.').split('\n')) {
      let line = '';
      for (const character of part) {
        if (line && ctx.measureText(line + character).width > max) { result.push(line); line = character; }
        else line += character;
      }
      result.push(line);
    }
    return result;
  }
  function text(value, size = 23, color = '#203e5d', weight = 400, space = 15) {
    const lines = wrap(value, inner, size, weight), lineHeight = Math.ceil(size * 1.65);
    commands.push({ kind: 'text', lines, y, size, lineHeight, color, weight });
    y += lines.length * lineHeight + space;
  }
  function section(title) { y += 24; commands.push({ kind: 'section', title, y }); y += 86; }
  function gallery() {
    const cols = photos.length === 1 ? 1 : 2, gap = 22, w = (inner - (cols - 1) * gap) / cols, h = cols === 1 ? 470 : 350;
    for (let index = 0; index < photos.length; index += cols) {
      let captionHeight = 0;
      photos.slice(index, index + cols).forEach((photo, column) => {
        const lines = wrap(photo.title, w - 24, 18, 500);
        captionHeight = Math.max(captionHeight, lines.length * 29);
        commands.push({ kind: 'image', photo, x: pad + column * (w + gap), y, w, h, lines });
      });
      y += h + captionHeight + 42;
    }
  }
  y = 67;
  text('부산 영화관 탐험대 · 함께 만든 발견 노트', 20, '#567999', 700, 17);
  text('우리 모둠 영화관 탐험 기록', 43, '#153d66', 800, 17);
  text([report.roomTitle, report.groupName].filter(Boolean).join(' · '), 23, '#567999', 600, 15);
  section('01  자료로 알아본 영화관');
  text(report.cinema.name, 30, '#1b4e79', 800, 17);
  gallery();
  text('우리가 찾은 특징', 20, '#416e98', 700, 5);
  text(report.draft.feature);
  text('특징을 확인한 근거', 20, '#416e98', 700, 5);
  text(report.selected.map(item => item.title).join(' / ') || '아직 담지 않았어요.', 20, '#60809b');
  text('사람들에게 주는 도움', 20, '#416e98', 700, 5);
  text(report.draft.help);
  section('02  영화관의 의미를 생각한 모둠 토의');
  for (const question of MEANING_QUESTIONS) {
    if (!report.draft.meaning[question.id].trim()) continue;
    text(question.topic + ' · ' + question.text, 20, '#416e98', 700, 5);
    text(report.draft.meaning[question.id]);
  }
  text('한 문장으로 정리한 의미', 20, '#416e98', 700, 5);
  text(report.draft.meaning.final, 27, '#1b4e79', 700, 20);
  y += 20;
  text(SOURCE_NOTE, 16, '#6886a0', 400, 0);
  const height = y + 75, scale = Math.min(1, 28800 / height);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.min(28800, Math.ceil(height * scale));
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f8fcff'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#8dcefa'; ctx.fillRect(0, 0, width, 21);
  ctx.strokeStyle = '#deedf9'; ctx.lineWidth = 1;
  for (let x = 18; x < width; x += 34) { ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x, height); ctx.stroke(); }
  ctx.fillStyle = '#f8fcff'; ctx.fillRect(pad - 22, 45, inner + 44, height - 78);
  function rounded(x, yy, w, h, radius) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, yy, w, h, radius);
    else ctx.rect(x, yy, w, h);
  }
  for (const command of commands) {
    if (command.kind === 'section') {
      ctx.fillStyle = '#c0e5ff'; ctx.strokeStyle = '#1b4e79'; ctx.lineWidth = 3;
      rounded(pad - 15, command.y, inner + 30, 59, 12); ctx.fill(); ctx.stroke();
      ctx.font = font(27, 800); ctx.fillStyle = '#1b4e79'; ctx.textBaseline = 'top';
      ctx.fillText(command.title, pad + 8, command.y + 10);
    } else if (command.kind === 'image') {
      const { photo, x, y: imageY, w, h, lines } = command;
      ctx.fillStyle = '#eaf4fc'; ctx.strokeStyle = '#4b7ba3'; ctx.lineWidth = 2;
      rounded(x, imageY, w, h, 14); ctx.fill(); ctx.stroke();
      const fit = Math.min((w - 20) / photo.img.naturalWidth, (h - 20) / photo.img.naturalHeight), iw = photo.img.naturalWidth * fit, ih = photo.img.naturalHeight * fit;
      ctx.drawImage(photo.img, x + (w - iw) / 2, imageY + (h - ih) / 2, iw, ih);
      ctx.font = font(18, 500); ctx.fillStyle = '#547998'; ctx.textBaseline = 'top';
      lines.forEach((line, index) => ctx.fillText(line, x + 12, imageY + h + 10 + index * 29));
    } else {
      ctx.font = font(command.size, command.weight); ctx.fillStyle = command.color; ctx.textBaseline = 'top';
      command.lines.forEach((line, index) => ctx.fillText(line, pad, command.y + index * command.lineHeight));
    }
  }
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('기록 이미지를 저장하지 못했어요. 다시 시도해 주세요.');
  const filename = safeFilename(`${report.groupName}_${report.cinema.name}_탐험기록`) + '.png';
  download(blob, filename);
  return { filename, width: canvas.width, height: canvas.height, photos: photos.length };
}
