"""Access/validation tests against the LOCAL official RTDB emulator only. No cloud writes."""
import base64,copy,json,time,urllib.request,urllib.parse,urllib.error
from pathlib import Path
PROJECT='demo-cinema-classroom3'
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
NS='cinemaClassV3';room='ABCD2345';at=int(time.time()*1000);path=lambda *p:'/'.join((NS,*p))
status,value=call('owner','PUT',data=json.loads((ROOT/'database.rules.json').read_text()),rules=True);assert status==200,('compile',status,value)
assert call('owner','DELETE')[0]==200
meta={'ownerUid':'teacher-a','createdAt':at,'expiresAt':at+604800000}
public={'title':'소개와 의미','open':True,'phase':'research','slide':0,'reveal':0,'presentingGroup':'','timerEndsAt':0,'createdAt':at,'expiresAt':at+604800000}
groups={f'g{i}':{'id':f'g{i}','name':f'{i}모둠','cinemaId':'lotte' if i==1 else 'millak'} for i in range(1,7)}
def profile(uid,n,g='g1',name='가람'):return {'uid':uid,'number':str(n),'groupId':g,'name':name,'joinedAt':at}
def entry(uid,n,g='g1',name='가람'):return {path('members',room,str(n)):profile(uid,n,g,name),path('registrations',room,uid):str(n)}
check('anonymous cannot create classroom','student-a','PUT',path('meta',room),{**meta,'ownerUid':'student-a'},True)
check('teacher owns classroom','teacher-a','PUT',path('meta',room),meta)
check('teacher initializes small state','teacher-a','PATCH',data={path('public',room):public,path('groups',room):groups})
check('no unauthenticated reads',None,'GET',path('public',room),deny=True)
check('no room enumeration','student-a','GET',path('public'),deny=True)
check('known room state before entry','student-a','GET',path('public',room))
check('peer teacher cannot read roster','teacher-b','GET',path('members',room),deny=True)
check('partial entry without registration blocked','student-a','PUT',path('members',room,'7'),profile('student-a',7),True)
check('entry with group number and name','student-a','PATCH',data=entry('student-a',7))
check('same number on different device blocked','student-b','PATCH',data=entry('student-b',7),deny=True)
check('same device claiming second number blocked','student-a','PATCH',data=entry('student-a',9),deny=True)
check('other group entry','student-c','PATCH',data=entry('student-c',10,'g2','다온'))
check('same group peer entry','student-b','PATCH',data=entry('student-b',8,'g1','나래'))
check('invalid student number blocked','student-d','PATCH',data=entry('student-d',41),deny=True)
check('student cannot list roster','student-a','GET',path('members',room),deny=True)
check('student reads own assignment','student-a','GET',path('groups',room,'g1'))
check('student cannot read another assignment','student-a','GET',path('groups',room,'g2'),deny=True)
check('student cannot edit assignment','student-a','PUT',path('groups',room,'g1','cinemaId'),'centum',True)
writer={'uid':'student-a','number':'7','name':'가람'}
check('member becomes recording student','student-a','PUT',path('writers',room,'g1'),writer)
check('peer cannot take recording role','student-b','PUT',path('writers',room,'g1'),{'uid':'student-b','number':'8','name':'나래'},True)
record={'cinemaId':'lotte','introduction':'동래구에 있는 영화관으로 여러 상영관에서 영화를 볼 수 있습니다.','meaning':'우리에게 새로운 이야기와 함께 감동하는 시간을 주는 문화 공간입니다.','revision':1,'submittedAt':at,'submittedBy':'student-a','submittedName':'가람','submittedNumber':'7'}
summary={'groupId':'g1','groupName':'1모둠','cinemaId':'lotte','revision':1,'submittedAt':at,'submittedName':'가람','submittedNumber':'7','introductionPreview':record['introduction'],'meaningPreview':record['meaning']}
def submit(r=record,s=summary):return {path('submissions',room,'g1'):r,path('summaries',room,'g1'):s}
check('group submit before own personal post blocked','student-a','PATCH',data=submit(),deny=True)
def opinion(uid='student-a',number='7',name='가람',q='joy',text='가족과 함께 새로운 이야기를 보며 즐거운 시간을 보낼 수 있어요.',cinema='lotte',rev=1):return {'cinemaId':cinema,'questionId':q,'text':text,'uid':uid,'number':number,'name':name,'revision':rev,'postedAt':at}
def post(r,g='g1',head=None):return {path('opinions',room,g,r['number']):r,path('opinionHeads',room,g,r['number']):head or {k:r[k] for k in ['cinemaId','questionId','revision','postedAt']}}
a=opinion()
check('personal post without paired head blocked','student-a','PUT',path('opinions',room,'g1','7'),a,True)
check('head without personal post blocked','student-a','PUT',path('opinionHeads',room,'g1','7'),{k:a[k] for k in ['cinemaId','questionId','revision','postedAt']},True)
check('fourth question blocked','student-a','PATCH',data=post(opinion(q='fourth')),deny=True)
check('multiple questions in one post blocked','student-a','PATCH',data=post({**a,'questionIds':['joy','local']}),deny=True)
check('empty personal opinion blocked','student-a','PATCH',data=post(opinion(text='')),deny=True)
check('whitespace personal opinion blocked','student-a','PATCH',data=post(opinion(text=' \n\t ')),deny=True)
check('overlong personal opinion blocked','student-a','PATCH',data=post(opinion(text='가'*181)),deny=True)
check('fake author name blocked','student-a','PATCH',data=post(opinion(name='다른이름')),deny=True)
check('fake auth UID blocked','student-a','PATCH',data=post(opinion(uid='student-b')),deny=True)
check('wrong student number blocked','student-a','PATCH',data=post(opinion(number='8')),deny=True)
check('wrong assigned cinema personal post blocked','student-a','PATCH',data=post(opinion(cinema='millak')),deny=True)
check('post in another group blocked','student-a','PATCH',data=post(a,'g2'),deny=True)
check('one selected question with own opinion accepted','student-a','PATCH',data=post(a))
check('same group reads personal opinions','student-b','GET',path('opinions',room,'g1'))
check('other group cannot read personal opinions','student-c','GET',path('opinions',room,'g1'),deny=True)
check('student cannot read whole class opinion board','student-a','GET',path('opinions',room),deny=True)
check('teacher reads tiny participation heads','teacher-a','GET',path('opinionHeads',room))
check('other teacher cannot read personal opinions','teacher-b','GET',path('opinions',room,'g1'),deny=True)
check('peer cannot edit another opinion','student-b','PATCH',data=post(opinion(text='다른 학생의 글 수정',rev=2)),deny=True)
check('personal opinion stale revision blocked','student-a','PATCH',data=post(a),deny=True)
check('head-only future update blocked','student-a','PUT',path('opinionHeads',room,'g1','7'),{**{k:a[k] for k in ['cinemaId','questionId','revision','postedAt']},'revision':2},True)
check('edit question and replace own single post','student-a','PATCH',data=post(opinion(q='local',rev=2)))
posts=check('one post remains for this student','student-a','GET',path('opinions',room,'g1'));assert len(posts)==1 and posts['7']['questionId']=='local'
check('second student can post their own chosen question','student-b','PATCH',data=post(opinion('student-b','8','나래','together','친구의 감상을 들으면 생각이 더 넓어져요.')))
check('peer cannot submit group final','student-b','PATCH',data=submit(),deny=True)
check('only introduction and meaning accepted without evidence','student-a','PATCH',data=submit())
check('group member can read final','student-b','GET',path('submissions',room,'g1'))
check('other group cannot read final','student-c','GET',path('submissions',room,'g1'),deny=True)
r2={**record,'revision':2};s2={**summary,'revision':2}
check('group stale update blocked','student-a','PATCH',data=submit(),deny=True)
check('group body-only update blocked','student-a','PUT',path('submissions',room,'g1'),r2,True)
check('group summary-only update blocked','student-a','PUT',path('summaries',room,'g1'),s2,True)
check('introduction longer than 120 blocked','student-a','PATCH',data=submit({**r2,'introduction':'가'*121},s2),deny=True)
check('meaning longer than 100 blocked','student-a','PATCH',data=submit({**r2,'meaning':'가'*101},s2),deny=True)
check('whitespace meaning blocked','student-a','PATCH',data=submit({**r2,'meaning':' \n '},s2),deny=True)
check('old mandatory evidence field rejected in new schema','student-a','PATCH',data=submit({**r2,'evidenceIds':['lotte-building']},s2),deny=True)
check('third help field rejected in new final','student-a','PATCH',data=submit({**r2,'help':'별도 도움'},s2),deny=True)
check('image payload blocked','student-a','PATCH',data=submit({**r2,'image':'data:image/png;base64,xx'},s2),deny=True)
check('final revised without extra fields accepted','student-a','PATCH',data=submit(r2,s2))
check('teacher selects one-screen presentation','teacher-a','PATCH',path('public',room),{'slide':11,'presentingGroup':'g1','phase':'present'})
check('student cannot change presentation','student-b','PUT',path('public',room,'slide'),5,True)
check('teacher changes assigned cinema','teacher-a','PUT',path('groups',room,'g1','cinemaId'),'millak')
check('old final preserved after reassignment','teacher-a','GET',path('submissions',room,'g1'))
r3={**r2,'revision':3,'cinemaId':'millak'};s3={**s2,'revision':3,'cinemaId':'millak'}
check('new group final before updated personal opinion blocked','student-a','PATCH',data=submit(r3,s3),deny=True)
check('old cinema personal update blocked','student-a','PATCH',data=post(opinion(rev=3)),deny=True)
check('personal post for reassigned cinema accepted','student-a','PATCH',data=post(opinion(cinema='millak',rev=3)))
check('final for reassigned cinema accepted','student-a','PATCH',data=submit(r3,s3))
check('teacher closes opinion and final posting','teacher-a','PUT',path('public',room,'open'),False)
check('closed class blocks personal updates','student-a','PATCH',data=post(opinion(cinema='millak',rev=4)),deny=True)
check('closed class blocks group updates','student-a','PATCH',data=submit({**r3,'revision':4},{**s3,'revision':4}),deny=True)
check('closed class retains read access','student-b','GET',path('opinions',room,'g1'))
check('closed class blocks new entry','student-d','PATCH',data=entry('student-d',11),deny=True)
check('owner reopens and changes writer','teacher-a','PATCH',data={path('public',room,'open'):True,path('writers',room,'g1'):None})
check('new recording student can claim','student-b','PUT',path('writers',room,'g1'),{'uid':'student-b','number':'8','name':'나래'})
check('previous recording student cannot submit','student-a','PATCH',data=submit({**r3,'revision':4},{**s3,'revision':4}),deny=True)
check('owner resets one student and their personal post','teacher-a','PATCH',data={path('members',room,'7'):None,path('registrations',room,'student-a'):None,path('opinions',room,'g1','7'):None,path('opinionHeads',room,'g1','7'):None})
check('removed student cannot read group opinions','student-a','GET',path('opinions',room,'g1'),deny=True)
check('group final survives entry reset','teacher-a','GET',path('submissions',room,'g1'))
assert call('owner','PUT',path('meta',room,'expiresAt'),at-1000)[0]==200
check('expired class blocks opinion reads','student-b','GET',path('opinions',room,'g1'),deny=True)
check('teacher can export expired personal posts','teacher-a','GET',path('opinions',room))
check('owner deletes all their classroom paths','teacher-a','PATCH',data={path(part,room):None for part in ['meta','public','groups','members','registrations','writers','opinions','opinionHeads','submissions','summaries']})
print(f'V3 security: {passed} cases passed.',flush=True)
