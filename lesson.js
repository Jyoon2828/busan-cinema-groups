export const LESSON = [
 {title:'우리 동네 영화관 탐험대',tag:'함께 발견하는 문화 공간',reveal:0},
 {title:'영화관에서 어떤 기억을 만들었나요?',tag:'기억 열기',reveal:2},
 {title:'부산의 영화관을 만나 봐요',tag:'오늘의 탐험 장소',reveal:0},
 {title:'발견하고, 이야기하고, 나눠요',tag:'오늘의 탐험',reveal:0},
 {title:'같은 링크로 우리 수업에 들어와요',tag:'태블릿 준비',reveal:0},
 {title:'사진과 글에서 단서를 찾아요',tag:'자료 조사',reveal:2},
 {title:'우리 모둠의 발견을 정리해요',tag:'모둠 정리',reveal:2},
 {title:'영화관은 어떤 즐거움을 줄까요?',tag:'의미 토의 ①',reveal:2},
 {title:'함께 영화를 보면 무엇이 좋을까요?',tag:'의미 토의 ②',reveal:2},
 {title:'우리 지역에 영화관이 없다면?',tag:'의미 토의 ③',reveal:2},
 {title:'우리의 생각을 한 문장에 담아요',tag:'의미 정리와 제출',reveal:1},
 {title:'우리 모둠의 발견을 나눠요',tag:'모둠 발표',reveal:0},
 {title:'영화관, 함께 경험하는 문화 공간',tag:'배움 돌아보기',reveal:2}
];
export function lessonHTML({slide,reveal=0,DATA,esc,img,btn,qrHTML,studentURL,roomId,groups,summaries,mismatch,presentationHTML}){
 const photo=(c,cls='')=>`<button class="lesson-photo ${cls}" data-action="lesson-zoom" data-cinema="${c.id}">${img(c.cover,c.coverAlt)}</button>`;
 const questions=items=>`<div class="lesson-questions">${items.map((text,i)=>`<div class="lesson-question ${i>reveal?'unrevealed':''}"><b>${i+1}</b><p>${i<=reveal?text:'다음 질문을 기다려요'}</p></div>`).join('')}</div>`;
 const layout=(left,right,cls='')=>`<div class="lesson-split ${cls}">${left}${right}</div>`;
 let body='';
 if(slide===0)body=`<div class="lesson-cover"><div class="cover-title"><span class="lesson-sticker">사진에서 찾고 · 모둠에서 나누고</span><h1>우리 동네<br><em>영화관 탐험대</em></h1><p>부산의 영화관에는<br>어떤 이야기와 가치가 숨어 있을까요?</p></div><div class="cover-collage"><div class="cover-polaroid one">${img(DATA[1].cover,DATA[1].coverAlt)}<span>함께 만나는 이야기</span></div><div class="cover-polaroid two">${img(DATA[3].cover,DATA[3].coverAlt)}<span>우리 지역의 문화 공간</span></div>${img('assets/geohaki.png','탐험을 안내하는 거학이','cover-geohaki')}</div></div>`;
 if(slide===1)body=layout(photo(DATA[1]),questions(['누구와 영화를 보러 갔나요?','어떤 장면에서 함께 웃거나 감동했나요?','영화가 끝난 뒤 어떤 이야기를 나누었나요?']));
 if(slide===2)body=`<div class="lesson-cinema-grid">${DATA.map(c=>`<article class="lesson-cinema-card">${photo(c)}<div><span>${esc(c.area)}</span><h2>${esc(c.name)}</h2></div></article>`).join('')}</div>`;
 if(slide===3)body=`<div class="lesson-path">${[['01','자료에서 발견해요','사진과 글을 살펴보고<br>특징을 확인한 근거를 모아요.','assets/centum-imax.jpg'],['02','모둠에서 토의해요','사람들에게 주는 즐거움과<br>지역 영화관의 의미를 생각해요.','assets/millak-sea.png'],['03','발견을 나눠요','함께 정리한 생각을 제출하고<br>사진과 글로 발표해요.','assets/corner-exterior.jpg']].map(([n,t,d,p])=>`<article><div class="path-photo">${img(p,t)}<b>${n}</b></div><h2>${t}</h2><p>${d}</p></article>`).join('')}</div>`;
 if(slide===4)body=layout(`<section class="lesson-qr"><div class="qr-code">${qrHTML}</div><span>수업 코드 <b>${esc(roomId)}</b></span>${btn('공통 링크 복사','copy-student','secondary')}</section>`,`<div class="lesson-entry-guide"><div><b>1</b><p><strong>우리 모둠</strong>을 골라요.</p></div><div><b>2</b><p><strong>번호와 이름</strong>을 써요.</p></div><div><b>3</b><p>지정된 영화관이 나타나면<br>사진과 글을 살펴봐요.</p></div><p class="lesson-note">기록이는 모둠에서 정한 한 명이 맡아요.</p></div>`);
 if(slide===5)body=layout(photo(DATA[4]),questions(['어떤 공간이나 활동이 눈에 띄나요?','그 특징을 어느 사진이나 글에서 확인했나요?','확인한 자료의 <strong>‘근거로 담기’</strong>를 눌러요.']));
 if(slide===6)body=layout(`<div class="lesson-notebook"><h2>우리 모둠의 발견 노트</h2><p>찾은 특징</p><div class="notebook-line"></div><p>특징을 확인한 근거</p><div class="notebook-line"></div><p>사람들에게 주는 도움</p><div class="notebook-line"></div></div>`,questions(['사진과 글에서 어떤 특징을 찾았나요?','그 특징 덕분에 사람들은 무엇을 할 수 있나요?','서로의 생각을 듣고 <strong>기록이</strong>가 모둠의 생각을 정리해요.']));
 if(slide===7)body=layout(`<div class="lesson-topic-art">${photo(DATA[4])}<span class="topic-ticket">즐거움</span></div>`,questions(['큰 화면과 좋은 소리로 영화를 보면 어떤 즐거움을 느낄까요?','가족이나 친구와 보내는 영화관의 시간은 왜 특별할까요?','영화 속 새로운 이야기와 인물에게서 무엇을 배울 수 있을까요?']));
 if(slide===8)body=layout(`<div class="lesson-topic-art">${photo(DATA[2])}<span class="topic-ticket">함께 보는 가치</span></div>`,questions(['같은 장면을 보며 함께 웃거나 감동하면 어떤 점이 좋을까요?','영화가 끝난 뒤 서로 다른 감상을 나누면 무엇을 알 수 있을까요?','여러 사람이 함께 즐기려면 어떤 배려가 필요할까요?']));
 if(slide===9)body=layout(`<div class="lesson-topic-art">${photo(DATA[3])}<span class="topic-ticket">우리 지역의 문화</span></div>`,questions(['지역에 영화관이 있으면 어떤 문화 활동을 쉽게 경험할 수 있을까요?','영화관은 어떤 사람들이 만나 문화를 즐기는 장소가 될까요?','영화관이 사라진다면 어떤 즐거움과 함께하는 경험이 줄어들까요?']));
 if(slide===10)body=`<div class="lesson-final"><div class="big-sentence">우리 지역 영화관은<br><span class="blank-space">무엇을?</span><br>함께 경험하는 문화 공간입니다.</div><div class="final-guidance"><p>조사한 특징과 모둠의 생각을 연결해요.</p>${reveal?'<div class="word-stickers"><span>즐거움</span><span>서로의 감상</span><span>새로운 이야기</span><span>함께하는 시간</span></div>':'<p class="small">우리 모둠만의 말로 빈칸을 채워요.</p>'}<p class="submit-reminder">함께 읽어 본 뒤, 기록이가 <strong>‘선생님께 제출’</strong>을 눌러요.</p></div></div>`;
 if(slide===11)body=presentationHTML||`<div class="lesson-groups">${Object.keys(groups).map(id=>{const g=groups[id],sub=summaries[id],c=DATA.find(c=>c.id===(sub?.cinemaId||g.cinemaId)),ready=sub&&!mismatch(id);return `<button class="lesson-group ${ready?'submitted':''}" data-action="present-group" data-group="${id}" ${!ready?'disabled':''}>${c?img(c.cover,c.coverAlt):'<div class="group-wait-icon">?</div>'}<div><span class="badge">${esc(g.name)}</span><h2>${esc(c?.name||'영화관 배정 대기')}</h2><p>${ready?'발표할 준비가 되었어요':mismatch(id)?'새 배정으로 다시 제출해요':'모둠의 정리를 기다려요'}</p></div></button>`;}).join('')}</div>`;
 if(slide===12)body=layout(`<div class="lesson-ending-art">${img('assets/geohaki.png','함께 배운 것을 나누는 거학이')}<p>우리 지역의 영화관을<br><strong>새로운 눈으로 바라봐요.</strong></p></div>`,questions(['우리 모둠이 새롭게 알게 된 것은 무엇인가요?','친구의 발표에서 기억에 남는 생각은 무엇인가요?','우리 지역 영화관은 어떤 의미를 지닌 문화 공간인가요?']));
 return `<section class="lesson-slide slide-${slide}">${slide===0?'':`<div class="lesson-heading"><span>${LESSON[slide].tag}</span><h1>${LESSON[slide].title}</h1></div>`}<div class="lesson-body">${body}</div></section>`;
}
