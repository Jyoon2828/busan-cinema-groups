"""Access/validation tests against the LOCAL official RTDB emulator only. No cloud writes."""
import base64,copy,json,time,urllib.request,urllib.parse,urllib.error
from pathlib import Path
PROJECT='demo-cinema-classroom'
BASE='http://127.0.0.1:9000'
ROOT=Path(__file__).resolve().parents[1]
OPENER=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def jwt(uid,provider):
 def b(v):return base64.urlsafe_b64encode(json.dumps(v,separators=(',',':')).encode()).decode().rstrip('=')
 at=int(time.time())
 return b({'alg':'none','type':'JWT'})+'.'+b({'iss':'https://securetoken.google.com/'+PROJECT,'aud':PROJECT,'iat':at,'exp':at+3600,'auth_time':at,'sub':uid,'user_id':uid,'firebase':{'sign_in_provider':provider}})+'.'
TOKENS={k:jwt(k,p) for k,p in [('teacher-a','google.com'),('teacher-b','google.com'),('student-a','anonymous'),('student-b','anonymous'),('student-c','anonymous'),('student-d','anonymous')]}
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
NS='cinemaClassV2';room='ABCD2345';at=int(time.time()*1000)
path=lambda *parts:'/'.join((NS,*parts))
status,value=call('owner','PUT',data=json.loads((ROOT/'database.rules.json').read_text()),rules=True)
assert status==200,('rules compile',status,value)
assert call('owner','DELETE')[0]==200
meta={'ownerUid':'teacher-a','createdAt':at,'expiresAt':at+604800000}
roomState={'title':'영화관 수업','open':True,'phase':'research','slide':0,'reveal':0,'presentingGroup':'','presentTab':'feature','presentPage':0,'timerEndsAt':0,'createdAt':at,'expiresAt':at+604800000}
groups={'g'+str(i):{'id':'g'+str(i),'name':str(i)+'모둠','cinemaId':'lotte' if i==1 else ''} for i in range(1,7)}
def profile(who,number,group='g1',name='테스트학생'):return {'uid':who,'number':str(number),'groupId':group,'name':name,'joinedAt':at}
def enroll(who,number,group='g1',name='테스트학생'):
 return {path('members',room,str(number)):profile(who,number,group,name),path('registrations',room,who):str(number)}
check('anonymous cannot create teacher room','student-a','PUT',path('meta',room),{**meta,'ownerUid':'student-a'},True)
check('Google teacher creates room','teacher-a','PUT',path('meta',room),meta)
check('owner initializes board and assignments','teacher-a','PATCH',data={path('public',room):roomState,path('groups',room):groups})
check('unauthenticated classroom read blocked',None,'GET',path('public',room),deny=True)
check('student cannot enumerate rooms','student-a','GET',path('public'),deny=True)
check('student reads small known classroom state','student-a','GET',path('public',room))
check('other teacher cannot manage classroom','teacher-b','PUT',path('public',room,'slide'),5,True)
check('student cannot change lesson slide','student-a','PUT',path('public',room,'slide'),5,True)
check('student cannot self assign cinema','student-a','PUT',path('groups',room,'g1','cinemaId'),'millak',True)
check('student can read own empty registration','student-a','GET',path('registrations',room,'student-a'))
check('profile without matching registration blocked','student-a','PUT',path('members',room,'7'),profile('student-a',7),True)
check('registration without matching profile blocked','student-a','PUT',path('registrations',room,'student-a'),'7',True)
check('number above forty blocked','student-d','PATCH',data=enroll('student-d',41),deny=True)
check('empty name blocked','student-d','PATCH',data=enroll('student-d',8,name=''),deny=True)
check('long name blocked','student-d','PATCH',data=enroll('student-d',8,name='가'*21),deny=True)
check('invalid group blocked','student-d','PATCH',data=enroll('student-d',8,group='g7'),deny=True)
check('student enrolls with group number name','student-a','PATCH',data=enroll('student-a',7,name='가람'))
check('duplicate number from other device blocked','student-b','PATCH',data=enroll('student-b',7),deny=True)
check('same device cannot register another number','student-a','PATCH',data=enroll('student-a',9),deny=True)
check('student cannot silently change group','student-a','PATCH',data=enroll('student-a',7,group='g2'),deny=True)
check('student reads assigned cinema','student-a','GET',path('groups',room,'g1'))
check('student cannot read another group','student-a','GET',path('groups',room,'g2'),deny=True)
check('student cannot read class roster','student-a','GET',path('members',room),deny=True)
check('student reads own entry','student-a','GET',path('members',room,'7'))
check('same group peer enrolls','student-b','PATCH',data=enroll('student-b',8,name='나래'))
check('another group student enrolls','student-c','PATCH',data=enroll('student-c',10,group='g2',name='다온'))
check('peer cannot read another student identity slot','student-b','GET',path('members',room,'7'),deny=True)
check('teacher can read bounded class roster','teacher-a','GET',path('members',room))
writer={'uid':'student-a','number':'7','name':'가람'}
check('registered member claims recording role','student-a','PUT',path('writers',room,'g1'),writer)
check('other member cannot take over writer','student-b','PUT',path('writers',room,'g1'),{'uid':'student-b','number':'8','name':'나래'},True)
check('writer cannot transfer role to someone else','student-a','PUT',path('writers',room,'g1'),{'uid':'student-b','number':'8','name':'나래'},True)
check('writer cannot delete role','student-a','DELETE',path('writers',room,'g1'),deny=True)
fields=['screen','special','story','emotion','thoughts','consideration','neighbours','opportunity','missing','final']
record={'cinemaId':'lotte','feature':'생활 속에서 영화를 즐기는 공간이에요.','help':'이웃과 함께 영화를 볼 수 있어요.','evidenceIds':['lotte-building'],'meaning':{k:'함께 감동을 경험하는 문화 공간입니다.' if k=='final' else '' for k in fields},'revision':1,'submittedAt':at,'submittedBy':'student-a','submittedName':'가람','submittedNumber':'7'}
summary={'groupId':'g1','groupName':'1모둠','cinemaId':'lotte','revision':1,'submittedAt':at,'submittedName':'가람','submittedNumber':'7','featurePreview':record['feature'],'meaningPreview':record['meaning']['final']}
def patch(r=record,s=summary):return {path('submissions',room,'g1'):r,path('summaries',room,'g1'):s}
check('non-writer cannot submit group result','student-b','PATCH',data=patch(),deny=True)
check('writer submits result and tiny summary atomically','student-a','PATCH',data=patch())
check('same group can read submitted group result','student-b','GET',path('submissions',room,'g1'))
check('other group cannot read result','student-c','GET',path('submissions',room,'g1'),deny=True)
check('student cannot list all results','student-a','GET',path('submissions',room),deny=True)
check('stale revision blocked','student-a','PATCH',data=patch(),deny=True)
r2={**record,'revision':2};s2={**summary,'revision':2}
check('body without summary blocked','student-a','PUT',path('submissions',room,'g1'),r2,True)
check('summary-only manipulation blocked','student-a','PUT',path('summaries',room,'g1'),{**summary,'meaningPreview':'가짜'},True)
check('future summary-only manipulation blocked','student-a','PUT',path('summaries',room,'g1'),s2,True)
check('wrong assigned cinema blocked','student-a','PATCH',data=patch({**r2,'cinemaId':'millak'},{**s2,'cinemaId':'millak'}),deny=True)
check('oversized body blocked','student-a','PATCH',data=patch({**r2,'feature':'가'*701},s2),deny=True)
check('unknown evidence blocked','student-a','PATCH',data=patch({**r2,'evidenceIds':['made-up']},s2),deny=True)
check('image data in database blocked','student-a','PATCH',data=patch({**r2,'image':'data:image/png;base64,a'},s2),deny=True)
check('spoofed submitter name blocked','student-a','PATCH',data=patch({**r2,'submittedName':'다른사람'},{**s2,'submittedName':'다른사람'}),deny=True)
check('updated valid result accepted','student-a','PATCH',data=patch(r2,s2))
check('teacher changes assigned cinema','teacher-a','PUT',path('groups',room,'g1','cinemaId'),'millak')
check('assignment change reaches own group','student-a','GET',path('groups',room,'g1'))
check('old submission preserved after assignment change','teacher-a','GET',path('submissions',room,'g1'))
check('old cinema resubmit blocked','student-a','PATCH',data=patch({**r2,'revision':3},{**s2,'revision':3}),deny=True)
r3={**r2,'revision':3,'cinemaId':'millak','evidenceIds':['millak-sea']};s3={**s2,'revision':3,'cinemaId':'millak'}
# Use an actual bundled Millak evidence identifier.
text=(ROOT/'data.js').read_text();cinemas=json.loads(text[text.index('=')+1:].strip().removesuffix(';'))
r3['evidenceIds']=[next(c for c in cinemas if c['id']=='millak')['evidence'][0]['id']]
check('new assigned cinema resubmitted','student-a','PATCH',data=patch(r3,s3))
check('teacher changes PPT slide','teacher-a','PATCH',path('public',room),{'slide':9,'reveal':2,'phase':'meaning'})
check('invalid PPT slide blocked','teacher-a','PUT',path('public',room,'slide'),13,True)
check('teacher selects group presentation','teacher-a','PATCH',path('public',room),{'slide':11,'presentingGroup':'g1','presentPage':0,'phase':'present'})
check('teacher closes submissions','teacher-a','PUT',path('public',room,'open'),False)
check('closed room blocks new entry','student-d','PATCH',data=enroll('student-d',11),deny=True)
check('existing student can still read assigned cinema','student-b','GET',path('groups',room,'g1'))
check('closed room blocks new writer','student-c','PUT',path('writers',room,'g2'),{'uid':'student-c','number':'10','name':'다온'},True)
check('closed room blocks new submission','student-a','PATCH',data=patch({**r3,'revision':4},{**s3,'revision':4}),deny=True)
check('teacher reopens and resets writer','teacher-a','PATCH',data={path('public',room,'open'):True,path('writers',room,'g1'):None})
check('peer can become new recording student','student-b','PUT',path('writers',room,'g1'),{'uid':'student-b','number':'8','name':'나래'})
check('previous writer cannot submit','student-a','PATCH',data=patch({**r3,'revision':4},{**s3,'revision':4}),deny=True)
check('teacher resets entry without erasing group result','teacher-a','PATCH',data={path('members',room,'7'):None,path('registrations',room,'student-a'):None})
check('removed member cannot read group','student-a','GET',path('groups',room,'g1'),deny=True)
check('same number can reenter after reset','student-d','PATCH',data=enroll('student-d',7),deny=False)
assert call('owner','PUT',path('meta',room,'expiresAt'),at-1000)[0]==200
check('expired classroom blocks student reads','student-d','GET',path('groups',room,'g1'),deny=True)
check('owner retains expired group results','teacher-a','GET',path('submissions',room,'g1'))
check('owner deletes all own classroom paths','teacher-a','PATCH',data={path(part,room):None for part in ['meta','public','groups','members','registrations','writers','submissions','summaries']})
print(f'Classroom V2 security: {passed} access and validation cases passed.',flush=True)
