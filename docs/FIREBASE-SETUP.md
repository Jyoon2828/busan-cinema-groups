# Firebase 연결과 이번 버전 업데이트

## 이미 연결한 프로젝트를 사용하는 경우

이 ZIP의 app-config.js에는 전달한 busan-cinema-groups 프로젝트의 웹 연결 설정 다섯 항목이 들어 있습니다. 값을 다시 입력할 필요는 없습니다.

1. Firebase 콘솔에서 busan-cinema-groups를 엽니다.
2. **Realtime Database → 규칙**을 엽니다.
3. 이 ZIP의 **database.rules.json 전체**를 복사해 규칙 편집창에 붙여 넣고 **게시**합니다.
4. ZIP 내용물 전체를 모둠용 GitHub 저장소에 덮어 올립니다. lesson.js와 assets, vendor 폴더도 포함합니다.
5. Vercel 재배포를 기다린 뒤 앱을 새로고침합니다.
6. **새 수업**을 만듭니다. 이전 버전 수업 코드를 이어 쓰는 방식은 아닙니다.

이번 학생 등록·기록이·수업 장면 동기화는 cinemaClassV3 아래에서 작동합니다. 기존 cinemaGroupsV1과 cinemaClassV2 데이터는 삭제하지 않으며, 제공한 규칙에는 두 이전 버전 규칙도 포함되어 있습니다. 다른 종류 앱과 같은 프로젝트를 사용 중이면 해당 앱의 규칙은 별도로 보존해야 합니다.

## 새 프로젝트에 연결하는 경우

1. Firebase 콘솔에서 프로젝트를 만듭니다. Analytics는 이 앱에 필요하지 않습니다. Spark 요금제에서 시작할 수 있습니다.
2. 웹 앱을 등록합니다. Firebase Hosting 대신 GitHub + Vercel에 파일을 올립니다.
3. **Realtime Database**를 만들고 콘솔에 표시된 URL을 복사합니다. 처음에는 잠금 모드로 만들고 제공한 규칙 전체를 게시합니다.
4. **Authentication → 로그인 방법**에서 **Google**과 **익명(Anonymous)**을 사용 설정합니다. Google의 프로젝트 지원 이메일을 선택합니다.
5. 웹 앱 설정의 apiKey, authDomain, projectId, appId와 Realtime Database의 databaseURL을 app-config.js에 넣습니다. window.CINEMA_FIREBASE_CONFIG 형식을 유지합니다.
6. GitHub에 압축을 푼 내용물 전체를 올립니다. Vercel은 Other, 빌드 명령 없음, 출력 위치는 필요하면 .을 사용합니다.
7. **Authentication → 설정 → 승인된 도메인**에 실제 Vercel 도메인을 추가합니다. https://나 뒷부분 경로는 제외합니다.

교사와 전자칠판은 수업을 만든 동일한 Google 계정으로 로그인합니다. 학생의 익명 인증은 앱이 자동 처리하므로 학생에게 계정 가입 화면을 보여 주지 않습니다. 학생이 입력하는 것은 모둠·번호·이름입니다.

서비스 계정 키나 Google 비밀번호는 입력하지 않습니다. Storage·Functions·Firestore·Analytics는 이 앱에서 사용하지 않습니다.

## 실제 기기에서 확인

1. 교사가 새 수업을 만들고 공통 링크 하나를 학생 태블릿에서 엽니다.
2. 학생이 모둠·번호·이름으로 들어옵니다.
3. 교사가 그 모둠에 영화관을 지정하고 학생 자료 화면이 바뀌는지 확인합니다.
4. 각자 의미 질문 세 개 중 하나를 골라 개인 의견을 게시합니다. 모둠에서 토의한 뒤 기록이가 역할을 맡고 영화관 소개와 의미 한 문장, 두 항목을 제출합니다. 근거 담기는 없습니다.
5. 교사 화면의 제출 완료 표시를 확인합니다.
6. 전자칠판을 같은 교사 계정·같은 수업으로 연결합니다. 교사가 발표를 누르면 해당 모둠의 사진과 글이 나타나는지 확인합니다.

주소에 demo=1이 있으면 연습 모드입니다. 같은 브라우저의 여러 탭에서만 이어지며 다른 실제 기기로 전송하지 않습니다.

## 오류 확인

| 현상 | 확인할 곳 |
| --- | --- |
| 권한 오류 또는 수업 생성 불가 | 이번 ZIP의 database.rules.json 전체 게시 여부 |
| Google 로그인 오류 | Google 로그인 사용 설정, 승인된 배포 도메인, 팝업 차단 |
| 학생 입장 불가 | 익명 로그인 설정, 수업 코드, 제출 열림 상태, 번호 중복 |
| 다른 학생의 입장 정보가 남음 | 교사 화면의 참여 학생에서 해당 입장 초기화 |
| 기록이가 제출하지 못함 | 기록이 역할, 자신의 개인 의견 게시, 현재 지정 영화관, 소개·의미 작성, 제출 열림 여부 |
| 기존 수업 코드가 열리지 않음 | 이번 버전에서 새 수업 생성 여부, 수업을 만든 Google 계정 |
| 전자칠판 연동 안 됨 | 동일 Google 계정·동일 수업, demo=1 제외, 활성 화면과 인터넷 연결 |

## 개발용 규칙 검증

Java 21과 Firebase CLI가 있는 환경에서 이 폴더를 기준으로 아래 명령을 실행합니다. demo- 프로젝트의 로컬 에뮬레이터만 사용합니다.

```
firebase emulators:exec --only database --project demo-cinema-classroom "python3 tests/firebase_rules_rest_test.py"
```

공식 안내:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/anonymous-auth
- https://firebase.google.com/docs/database/security/core-syntax
- https://firebase.google.com/docs/database/web/read-and-write

## 이 버전의 규칙 업데이트

개인 의견 경로와 최종 두 항목 형식이 바뀌었습니다. 기존 연결 설정은 그대로 쓰고, ZIP 안의 database.rules.json 전체를 다시 게시한 뒤 새 수업을 만듭니다. 이전 수업 코드를 이어 사용하지 않습니다.

## 개인 의견 게시 오류 수정본

이미 cinemaClassV3 수업을 사용 중이라면 이번 빈 번호 처리 수정에는 Firebase 설정이나 규칙 변경이 필요 없습니다. 웹앱 파일을 교체하고 새로고침합니다. 기존 수업 코드와 기록을 그대로 사용할 수 있습니다.
