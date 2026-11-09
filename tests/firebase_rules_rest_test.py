"""Access/validation tests against the LOCAL official RTDB emulator only. No cloud writes."""
import base64,copy,json,time,urllib.request,urllib.parse,urllib.error
from pathlib import Path
PROJECT='demo-cinema-groups'
BASE='http://127.0.0.1:9000'
ROOT=Path(__file__).resolve().parents[1]
OPENER=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def jwt(uid,provider):
 def b(v):return base64.urlsafe_b64encode(json.dumps(v,separators=(',',':')).encode()).decode().rstrip('=')
 at=int(time.time())
 return b({'alg':'none','type':'JWT'})+'.'+b({'iss':'https://securetoken.google.com/'+PROJECT,'aud':PROJECT,'iat':at,'exp':at+3600,'auth_time':at,'sub':uid,'user_id':uid,'firebase':{'sign_in_provider':provider}})+'.'
TOKENS={k:jwt(k,p) for k,p in [('teacher-a','google.com'),('teacher-b','google.com'),('student-a','anonymous'),('student-b','anonymous')]}
def call(who,method,p='',data=None,rules=False):
 headers={'Content-Type':'application/json'}
 if who=='owner':headers['Authorization']='Bearer owner'
 query={'ns':PROJECT}
 if who and who!='owner':query['auth']=TOKENS[who]
 url=BASE+('/.settings/rules.json' if rules else '/'+p.strip('/')+('.json' if p else '.json'))+'?'+urllib.parse.urlencode(query)
 req=urllib.request.Request(url,data=json.dumps(data,ensure_ascii=False).encode() if data is not None else None,headers=headers,method=method)
 try:
  with OPENER.open(req,timeout=10) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
passed=0
def check(label,who,method,p='',data=None,deny=False):
 global passed
 status,value=call(who,method,p,data)
 assert status in (401,403) if deny else status==200,(label,status,value)
 passed+=1;print('PASS',label,flush=True)
 return value
NS='cinemaGroupsV1';room='ABCD2345';at=int(time.time()*1000);token='a'*43
path=lambda *parts:'/'.join((NS,*parts))
fields=['screen','special','story','emotion','thoughts','consideration','neighbours','opportunity','missing','final']
data_text=(ROOT/'data.js').read_text();cinemas=json.loads(data_text[data_text.index('=')+1:].strip().removesuffix(';'))
evidence=next(c for c in cinemas if c['id']=='lotte')['evidence'][0]['id']
record={'cinemaId':'lotte','feature':'생활 속 영화관이에요.','help':'이웃과 함께 영화를 즐겨요.','evidenceIds':[evidence],'meaning':{k:'함께 감동을 경험하는 문화 공간이에요.' if k=='final' else '' for k in fields},'revision':1,'submittedAt':at,'submittedBy':'student-a'}
summary={'groupId':'g1','groupName':'1모둠','cinemaId':'lotte','revision':1,'submittedAt':at,'featurePreview':record['feature'],'meaningPreview':record['meaning']['final']}
patch=lambda r,s:{path('submissions',room,'g1'):r,path('summaries',room,'g1'):s}
assert call('owner','PUT',data=json.loads((ROOT/'database.rules.json').read_text()),rules=True)[0]==200
assert call('owner','DELETE')[0]==200
check('anonymous cannot create teacher room','student-a','PUT',path('meta','EFGH2345'),{'ownerUid':'student-a','createdAt':at,'expiresAt':at+604800000},True)
check('teacher creates owned metadata','teacher-a','PUT',path('meta',room),{'ownerUid':'teacher-a','createdAt':at,'expiresAt':at+604800000})
groups={'g'+str(i+1):{'id':'g'+str(i+1),'name':str(i+1)+'모둠','cinemaId':'lotte' if i==0 else '','joinToken':token} for i in range(6)}
check('teacher initializes small room and groups','teacher-a','PATCH',data={path('public',room):{'title':'규칙 점검','open':True,'phase':'research','presentingGroup':'','createdAt':at,'expiresAt':at+604800000},path('groups',room):groups})
check('unauthenticated reads denied',None,'GET',path('public',room),deny=True)
check('other teacher cannot read private groups','teacher-b','GET',path('groups',room),deny=True)
check('wrong join token denied','student-a','PUT',path('members',room,'g1'),{'uid':'student-a','token':'b'*43,'joinedAt':at},True)
check('representative claims own group','student-a','PUT',path('members',room,'g1'),{'uid':'student-a','token':token,'joinedAt':at})
check('second device cannot take over','student-b','PUT',path('members',room,'g1'),{'uid':'student-b','token':token,'joinedAt':at},True)
check('student reads own assignment','student-a','GET',path('groups',room,'g1'))
check('student cannot read other group','student-a','GET',path('groups',room,'g2'),deny=True)
check('student cannot read namespace root','student-a','GET',NS,deny=True)
check('student cannot read database root','student-a','GET',deny=True)
check('student cannot list all submissions','student-a','GET',path('submissions',room),deny=True)
check('submission and summary commit atomically','student-a','PATCH',data=patch(record,summary))
revision2={**record,'revision':2,'submittedAt':int(time.time()*1000)};small2={**summary,'revision':2,'submittedAt':revision2['submittedAt']}
check('direct submission without matching summary denied','student-a','PUT',path('submissions',room,'g1'),revision2,True)
check('stale revision denied','student-a','PATCH',data=patch(record,summary),deny=True)
check('oversized text denied','student-a','PATCH',data=patch({**revision2,'feature':'x'*701},small2),deny=True)
check('unknown payload including image rejected','student-a','PATCH',data=patch({**revision2,'image':'data:image/png;base64,AAAA'},small2),deny=True)
check('wrong assigned cinema denied','student-a','PATCH',data=patch({**revision2,'cinemaId':'millak'},{**small2,'cinemaId':'millak'}),deny=True)
check('unrecognized evidence rejected','student-a','PATCH',data=patch({**revision2,'evidenceIds':['not-bundled']},small2),deny=True)
check('empty evidence rejected','student-a','PATCH',data=patch({**revision2,'evidenceIds':[]},small2),deny=True)
check('mismatched summary revision rejected','student-a','PATCH',data=patch(revision2,{**small2,'revision':3}),deny=True)
check('valid revision succeeds','student-a','PATCH',data=patch(revision2,small2))
check('summary-only same-revision poisoning rejected','student-a','PUT',path('summaries',room,'g1'),{**small2,'featurePreview':'바꾼 가짜 요약'},True)
check('summary-only future-revision poisoning rejected','student-a','PUT',path('summaries',room,'g1'),{**small2,'revision':3},True)
check('student cannot delete body and leave stale summary','student-a','DELETE',path('submissions',room,'g1'),deny=True)
check('student cannot delete summary only','student-a','DELETE',path('summaries',room,'g1'),deny=True)
check('other teacher cannot delete room','teacher-b','DELETE',path('meta',room),deny=True)
check('other teacher cannot select presentation','teacher-b','PUT',path('public',room,'presentingGroup'),'g1',True)
check('owner selects board presentation','teacher-a','PATCH',path('public',room),{'presentingGroup':'g1','phase':'present'})
check('owner closes submissions','teacher-a','PUT',path('public',room,'open'),False)
check('existing representative can rejoin closed room','student-a','PUT',path('members',room,'g1'),{'uid':'student-a','token':token,'joinedAt':at})
check('new representative cannot join closed room','student-b','PUT',path('members',room,'g2'),{'uid':'student-b','token':token,'joinedAt':at},True)
rev3={**record,'revision':3,'submittedAt':int(time.time()*1000)};small3={**summary,'revision':3,'submittedAt':rev3['submittedAt']}
check('closed room rejects resubmission','student-a','PATCH',data=patch(rev3,small3),deny=True)
check('owner reopens and resets representative','teacher-a','PATCH',data={path('public',room,'open'):True,path('groups',room,'g1','joinToken'):'c'*43,path('members',room,'g1'):None})
check('old representative cannot write after reset','student-a','PATCH',data=patch(rev3,small3),deny=True)
check('old token cannot reclaim group','student-a','PUT',path('members',room,'g1'),{'uid':'student-a','token':token,'joinedAt':at},True)
check('new representative joins fresh token','student-b','PUT',path('members',room,'g1'),{'uid':'student-b','token':'c'*43,'joinedAt':at})
assert call('owner','PUT',path('meta',room,'expiresAt'),at-1000)[0]==200
check('expired room rejects writes','student-b','PATCH',data=patch({**rev3,'submittedBy':'student-b'},small3),deny=True)
check('owner can still read expired work','teacher-a','GET',path('submissions',room,'g1'))
check('owner can delete all their room paths','teacher-a','PATCH',data={path(part,room):None for part in ['meta','public','groups','members','submissions','summaries']})
print(f'Firebase Realtime Database rules: {passed} access/validation checks passed.',flush=True)
