export const LESSON = [
 {title:'우리 동네 영화관 탐험대',tag:'함께 발견하는 문화 공간',reveal:0},
 {title:'영화관에서 어떤 기억을 만들었나요?',tag:'기억 열기',reveal:2},
 {title:'부산의 영화관을 만나 봐요',tag:'오늘의 탐험 장소',reveal:0},
 {title:'발견하고, 이야기하고, 나눠요',tag:'오늘의 탐험',reveal:0},
 {title:'같은 링크로 우리 수업에 들어와요',tag:'태블릿 준비',reveal:0},
 {title:'사진과 글에서 단서를 찾아요',tag:'자료 조사',reveal:2},
 {title:'영화관을 간단히 소개해요',tag:'영화관 소개',reveal:0},
 {title:'질문 하나를 골라 내 의견을 게시해요',tag:'개인 의견 나누기',reveal:0},
 {title:'모둠 친구들의 생각을 읽어요',tag:'모둠 게시판',reveal:0},
 {title:'우리 모둠의 의미를 하나로 모아요',tag:'모둠 의미 토의',reveal:0},
 {title:'소개와 의미, 두 가지만 정리해요',tag:'모둠 정리와 제출',reveal:0},
 {title:'우리 모둠의 발견을 나눠요',tag:'모둠 발표',reveal:0},
 {title:'영화관, 함께 경험하는 문화 공간',tag:'배움 돌아보기',reveal:2}
];
export function lessonHTML({slide,reveal=0,DATA,esc,img,btn,qrHTML,studentURL,roomId,groups,summaries,mismatch,presentationHTML,questions:discussion=[],opinionHeads={}}){
 const photo=(c,cls='')=>`<button class="lesson-photo ${cls}" data-action="lesson-zoom" data-cinema="${c.id}">${img(c.cover,c.coverAlt)}</button>`;
 const questions=items=>`<div class="lesson-questions">${items.map((text,i)=>`<div class="lesson-question ${i>reveal?'unrevealed':''}"><b>${i+1}</b><p>${i<=reveal?text:'다음 질문을 기다려요'}</p></div>`).join('')}</div>`;
 const layout=(left,right,cls='')=>`<div class="lesson-split ${cls}">${left}${right}</div>`;
 let body='';
 if(slide===0)body=`<div class="lesson-cover"><div class="cover-title"><span class="lesson-sticker">사진에서 찾고 · 모둠에서 나누고</span><h1>우리 동네<br><em>영화관 탐험대</em></h1><p>부산의 영화관에는<br>어떤 이야기와 가치가 숨어 있을까요?</p></div><div class="cover-collage"><div class="cover-polaroid one">${img(DATA[1].cover,DATA[1].coverAlt)}<span>함께 만나는 이야기</span></div><div class="cover-polaroid two">${img(DATA[3].cover,DATA[3].coverAlt)}<span>우리 지역의 문화 공간</span></div>${img('assets/geohaki.png','탐험을 안내하는 거학이','cover-geohaki')}</div></div>`;
 if(slide===1)body=layout(photo(DATA[1]),questions(['누구와 영화를 보러 갔나요?','어떤 장면에서 함께 웃거나 감동했나요?','영화가 끝난 뒤 어떤 이야기를 나누었나요?']));
 if(slide===2)body=`<div class="lesson-cinema-grid">${DATA.map(c=>`<article class="lesson-cinema-card">${photo(c)}<div><span>${esc(c.area)}</span><h2>${esc(c.name)}</h2></div></article>`).join('')}</div>`;
 if(slide===3)body=`<div class="lesson-path">${[['01','영화관을 알아봐요','사진과 설명을 읽고<br>어떤 영화관인지 알아봐요.','assets/centum-imax.jpg'],['02','각자의 생각을 나눠요','세 질문 중 하나를 골라<br>내 의견을 게시해요.','assets/millak-sea.png'],['03','모둠의 생각을 모아요','소개와 의미를 정리하고<br>두 가지를 함께 발표해요.','assets/corner-exterior.jpg']].map(([n,t,d,p])=>`<article><div class="path-photo">${img(p,t)}<b>${n}</b></div><h2>${t}</h2><p>${d}</p></article>`).join('')}</div>`;
 if(slide===4)body=layout(`<section class="lesson-qr"><div class="qr-code">${qrHTML}</div><span>수업 코드 <b>${esc(roomId)}</b></span>${btn('공통 링크 복사','copy-student','secondary')}</section>`,`<div class="lesson-entry-guide"><div><b>1</b><p><strong>우리 모둠</strong>을 골라요.</p></div><div><b>2</b><p><strong>번호와 이름</strong>을 써요.</p></div><div><b>3</b><p>지정된 영화관이 나타나면<br>사진과 글을 살펴봐요.</p></div><p class="lesson-note">기록이는 모둠에서 정한 한 명이 맡아요.</p></div>`);
 if(slide===5)body=layout(photo(DATA[4]),`<div class="lesson-reading-guide"><h2>사진과 긴 설명을 자세히 읽어요.</h2><p>사진 아래 <strong>이전 자료 · 다음 자료</strong>로 자료를 바꿔요.</p><p><strong>앞 설명 · 다음 설명</strong>으로 이어지는 내용을 읽어요.</p><p class="lesson-note">영화관의 장소와 관람 방식, 공간의 모습을 알아봐요.</p></div>`);
 if(slide===6)body=layout(`<div class="lesson-notebook"><h2>영화관 소개</h2><p>이 영화관은 어떤 곳인가요?</p><div class="notebook-line"></div><p class="small">사진과 설명에서 알게 된 내용을 간단히 써요.</p></div>`,`<div class="lesson-intro-labels"><span>어디에 있는지</span><span>영화를 어떻게 보는지</span><span>어떤 공간이나 활동이 있는지</span><p>핵심 내용을 골라 짧게 소개해요.</p></div>`);
 if(slide===7)body=`<div class="lesson-personal-questions">${discussion.map((q,i)=>`<article><b>${i+1}</b><h2>${esc(q.text)}</h2></article>`).join('')}</div><div class="lesson-post-instruction"><strong>각자 한 개만 선택</strong><span>내 생각 쓰기 → 내 의견 게시</span></div>`;
 if(slide===8)body=`<div class="lesson-opinion-groups">${Object.values(groups).map(g=>{const count=Object.values(opinionHeads[g.id]||{}).filter(o=>o.cinemaId===g.cinemaId).length;return `<button data-action="group-opinions" data-group="${g.id}"><span>${esc(g.name)}</span><strong>${count}명의 의견</strong><small>함께 읽기 →</small></button>`;}).join('')}</div><p class="lesson-post-instruction">모둠 게시판을 읽고 서로의 생각을 나누어요.</p>`;
 if(slide===9)body=`<div class="lesson-meaning-steps"><div><b>1</b><h2>개인 의견 읽기</h2><p>친구들의 생각을 모두 살펴봐요.</p></div><div><b>2</b><h2>생각 연결하기</h2><p>비슷한 생각과 더하고 싶은 생각을 나눠요.</p></div><div><b>3</b><h2>의미 한 문장 정하기</h2><p>함께 정한 의미를 기록이가 써요.</p></div></div><div class="meaning-sentence">우리 모둠이 생각한 영화관은 <span>________________</span> 문화 공간입니다.</div>`;
 if(slide===10)body=`<div class="lesson-two-results"><article><span>01</span><h2>영화관 소개</h2><p>사진과 설명에서 알게 된 내용을<br>간단히 소개해요.</p></article><article><span>02</span><h2>영화관이 우리에게 주는 의미</h2><p>개인 의견을 모아 토의하고<br>우리 모둠의 의미를 한 문장으로 써요.</p></article></div><p class="lesson-post-instruction">함께 읽어 본 뒤, 기록이가 <strong>선생님께 제출</strong>을 눌러요.</p>`;
 if(slide===11)body=presentationHTML||`<div class="lesson-groups">${Object.keys(groups).map(id=>{const g=groups[id],sub=summaries[id],c=DATA.find(c=>c.id===(sub?.cinemaId||g.cinemaId)),ready=sub&&!mismatch(id);return `<button class="lesson-group ${ready?'submitted':''}" data-action="present-group" data-group="${id}" ${!ready?'disabled':''}>${c?img(c.cover,c.coverAlt):'<div class="group-wait-icon">?</div>'}<div><span class="badge">${esc(g.name)}</span><h2>${esc(c?.name||'영화관 배정 대기')}</h2><p>${ready?'발표할 준비가 되었어요':mismatch(id)?'새 배정으로 다시 제출해요':'모둠의 정리를 기다려요'}</p></div></button>`;}).join('')}</div>`;
 if(slide===12)body=layout(`<div class="lesson-ending-art">${img('assets/geohaki.png','함께 배운 것을 나누는 거학이')}<p>우리 지역의 영화관을<br><strong>새로운 눈으로 바라봐요.</strong></p></div>`,questions(['우리 모둠이 새롭게 알게 된 것은 무엇인가요?','친구의 발표에서 기억에 남는 생각은 무엇인가요?','우리 지역 영화관은 어떤 의미를 지닌 문화 공간인가요?']));
 return `<section class="lesson-slide slide-${slide}">${slide===0?'':`<div class="lesson-heading"><span>${LESSON[slide].tag}</span><h1>${LESSON[slide].title}</h1></div>`}<div class="lesson-body">${body}</div></section>`;
}
