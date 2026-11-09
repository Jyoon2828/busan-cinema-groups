import {sanitizeDraft} from './model.js';
const SOURCE_NOTE='자료 출처: 영화관 공식 안내 및 공공기관 자료 참고';
const cinemas=()=>globalThis.CINEMA_DATA||globalThis.window?.CINEMA_DATA||[];
const safeName=v=>String(v||'모둠_영화관_이야기').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,110);
function content({roomTitle='',groupName='우리 모둠',submission}={}){const draft=sanitizeDraft(submission),cinema=cinemas().find(c=>c.id===draft.cinemaId);if(!cinema)throw new Error('조사할 영화관을 먼저 확인해 주세요.');return {roomTitle,groupName,cinema,draft};}
function download(blob,filename){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
export function buildReportText(options){const {groupName,cinema,draft}=content(options);return ['우리 모둠의 영화관 이야기',groupName+' · '+cinema.name,'','[영화관 소개]',draft.introduction||'(미작성)','','[영화관이 우리에게 주는 의미]',draft.meaning||'(미작성)','',SOURCE_NOTE].join('\n');}
export function saveJSON(data,filename='영화관_의견과모둠정리.json'){const name=safeName(filename),full=/\.json$/i.test(name)?name:name+'.json';download(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),full);return full;}
export const downloadJSON=saveJSON;
export async function downloadGroupPNG(options){
 const {groupName,cinema,draft}=content(options);if(document.fonts?.ready)await document.fonts.ready;
 const photo=new Image();photo.src=cinema.cover;try{await photo.decode();}catch{throw new Error('영화관 사진을 불러오지 못했어요. 사진이 보이는지 확인해 주세요.');}
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('기록 이미지를 만들지 못했어요.');
 const font=(n,weight=600)=>`${weight} ${n}px "Noto Sans KR","Malgun Gothic",sans-serif`;
 const rounded=(x,y,w,h,r)=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);};
 const card=(x,y,w,h,bg='#fff')=>{ctx.fillStyle='#254e70';rounded(x+5,y+7,w,h,22);ctx.fill();ctx.fillStyle=bg;ctx.strokeStyle='#254e70';ctx.lineWidth=3;rounded(x,y,w,h,22);ctx.fill();ctx.stroke();};
 function lines(v,w,size){ctx.font=font(size);const chars=Array.from(String(v||'아직 정리하지 않았어요.').replace(/\s+/g,' ').trim());let line='',result=[];for(const ch of chars){if(line&&ctx.measureText(line+ch).width>w){result.push(line);line='';}line+=ch;}if(line)result.push(line);return result.length?result:['아직 정리하지 않았어요.'];}
 function textBox(x,y,w,h,label,text,bg){card(x,y,w,h,bg);ctx.font=font(27,800);ctx.fillStyle='#397caa';ctx.fillText(label,x+29,y+47);let size=34,rows=[];do{rows=lines(text,w-58,size);if(rows.length*size*1.55<=h-105)break;size--;}while(size>19);ctx.font=font(size,650);ctx.fillStyle='#193f60';ctx.textBaseline='top';rows.forEach((line,i)=>ctx.fillText(line,x+29,y+76+i*size*1.55));ctx.textBaseline='alphabetic';}
 ctx.fillStyle='#eef8ff';ctx.fillRect(0,0,1600,1000);ctx.strokeStyle='#d6eaf7';ctx.lineWidth=1;for(let x=0;x<1600;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1000);ctx.stroke();}for(let y=0;y<1000;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1600,y);ctx.stroke();}
 ctx.fillStyle='#245b83';ctx.font=font(28,800);ctx.fillText('우리 모둠의 영화관 이야기',60,62);ctx.font=font(43,900);ctx.fillStyle='#163f60';ctx.fillText(groupName+' · '+cinema.name,60,127);
 card(60,184,616,670,'#e1f2fc');const fit=Math.min(576/photo.naturalWidth,570/photo.naturalHeight),iw=photo.naturalWidth*fit,ih=photo.naturalHeight*fit;ctx.drawImage(photo,80+(576-iw)/2,211+(570-ih)/2,iw,ih);ctx.font=font(24,650);ctx.fillStyle='#567e9c';ctx.fillText('사진으로 만나는 '+cinema.name,87,821);
 textBox(710,184,830,320,'01  영화관 소개',draft.introduction,'#ffffff');textBox(710,534,830,320,'02  영화관이 우리에게 주는 의미',draft.meaning,'#e3f4ff');
 ctx.font=font(22,500);ctx.fillStyle='#60809a';ctx.fillText(SOURCE_NOTE,62,940);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('기록 이미지를 만들지 못했어요.');const filename=safeName(groupName+'_'+cinema.name+'_소개와의미')+'.png';download(blob,filename);return {filename,width:canvas.width,height:canvas.height,photos:1};
}
