# Firebase 연결 준비

이 파일 묶음은 별도 모둠용 앱입니다. 개인용 앱이나 다른 수업 앱의 Firebase 프로젝트를 자동으로 수정하지 않습니다. Firebase 설정이 비어 있으면 실제 모둠 제출은 연결되지 않으며, 체험 모드로 화면과 수업 흐름을 먼저 확인할 수 있습니다.

## 1. 전용 프로젝트와 웹 앱 만들기

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 이 수업 앱을 위한 프로젝트를 만듭니다. Analytics는 이 앱에 필요하지 않습니다.
2. 프로젝트 설정에서 웹 앱을 추가합니다. Firebase Hosting 연결은 필요하지 않습니다. 웹앱은 GitHub + Vercel에 올립니다.
3. **Realtime Database**를 만들고 콘솔에 표시된 Database URL을 복사합니다. Firestore가 아닙니다. 공개 테스트 모드 규칙을 사용하지 않습니다.
4. 웹 앱의 Firebase 설정에서 `apiKey`, `authDomain`, `projectId`, `appId`를 복사합니다. `databaseURL`은 방금 만든 Realtime Database의 정확한 URL을 넣습니다.

## 2. 로그인 방법 켜기

Authentication → 로그인 방법에서 **Google**과 **익명(Anonymous)**을 켭니다. Google 설정에서는 프로젝트 지원 이메일을 선택합니다.

- 교사와 전자칠판: 같은 Google 계정으로 로그인합니다. 다른 기기에서도 같은 수업 코드를 열 수 있습니다.
- 모둠 대표 태블릿: 익명 인증이 자동으로 이루어집니다. 학생 이름·메일·비밀번호를 입력하지 않습니다.
- 앱은 교사용/학생용 Firebase 앱 인스턴스를 분리하므로, 같은 브라우저에서 모드를 바꾸어도 교사 로그인을 학생 익명 계정으로 바꾸지 않습니다.

Authentication → 설정 → 승인된 도메인에 실제 Vercel 도메인을 추가합니다. `https://`와 경로는 넣지 않습니다. 개발 환경에서 로그인하려면 그 개발 도메인도 승인해야 합니다. 주소가 바뀌면 새 주소를 추가합니다.

## 3. 데이터베이스 규칙 적용

전용 프로젝트의 Realtime Database → **규칙**에 프로젝트 루트의 `database.rules.json` 전체를 붙여 넣고 게시합니다. 상위 경로에 `.read: true` 또는 `.write: true`를 두지 않습니다.

이 규칙은 `cinemaGroupsV1` 아래만 사용하며, 다음을 제한합니다.

- 수업을 만든 Google 계정만 수업 설정·모둠 링크·전체 제출물을 읽거나 관리합니다.
- 학생은 모둠 전용 긴 토큰 링크로 대표 기기 1대만 등록합니다.
- 등록한 학생은 자신의 모둠 배정과 제출물만 읽습니다. 다른 모둠의 글이나 전체 수업 목록을 읽을 수 없습니다.
- 제출은 배정한 영화관(자유 선택이면 여섯 곳 중 하나), 실제 자료 ID, 글자 수, 제출 버전을 검사합니다.
- 제출 본문과 작은 제출 요약은 한 번의 원자적 업데이트로 함께 저장합니다.
- 수업 제출을 닫으면 새로운 제출을 막습니다. 이미 등록한 대표 기기는 다시 들어가 기존 글을 보고 기기 안에서 계속 작성할 수 있습니다.
- 수업은 만든 시점부터 7일 동안 학생이 이용할 수 있습니다. 만료는 접근을 막는 기능이며 자동 삭제가 아닙니다. 교사는 만료 후에도 결과를 내려받고 수업을 삭제할 수 있습니다.

다른 앱이 사용하는 프로젝트를 합쳐 쓰려면 기존 규칙을 보존한 상태로 `cinemaGroupsV1` 규칙을 병합해야 합니다. 기존 루트 규칙이 공개 읽기/쓰기를 허용하면 하위 규칙으로 그것을 취소할 수 없습니다. 따라서 이 앱에는 전용 프로젝트를 권장합니다. 기존 규칙 전체를 이 파일로 덮어쓰면 다른 앱의 접근이 차단될 수 있으므로 그렇게 하지 않습니다.

Firebase CLI를 이미 사용하는 경우 이 폴더의 `firebase.json`을 기준으로 자신의 프로젝트에 `firebase deploy --only database --project 자신의-프로젝트-ID`를 실행할 수도 있습니다. 모의 테스트용 `demo-cinema-groups`는 실제 배포 대상이 아닙니다.

## 4. app-config.js 입력

프로젝트 루트의 `app-config.js`에서 빈 설정을 자신의 웹 앱 설정으로 바꿉니다.

```js
window.CINEMA_FIREBASE_CONFIG = {
  apiKey: "Firebase 웹 앱의 apiKey",
  authDomain: "Firebase 웹 앱의 authDomain",
  databaseURL: "Realtime Database의 정확한 URL",
  projectId: "Firebase 프로젝트 ID",
  appId: "Firebase 웹 앱의 appId"
};
```

이 값은 브라우저용 공개 연결 정보입니다. 서비스 계정 키, 비공개 키, Google 비밀번호는 넣지 않습니다. 실제 접근 권한은 Authentication과 데이터베이스 규칙이 제어합니다. 이 앱은 Storage·Cloud Functions·유료 API를 요구하지 않습니다.

## 5. GitHub + Vercel

압축을 푼 **내용물 전체**를 새 GitHub 저장소의 최상위에 올립니다. Vercel에서는 Framework Preset을 **Other**로 두고 설치·빌드 명령 없이 배포합니다. 기존 개인용 앱에 덮어 올리지 않습니다. 배포한 Vercel 주소를 위의 승인된 도메인에 추가합니다.

그 뒤 다음을 점검합니다.

1. 교사 Google 로그인 → 수업 만들기 → 여섯 모둠의 영화관 배정.
2. 각 모둠 전용 링크를 대표 태블릿에서 열기. 같은 링크를 여러 기기에서 동시에 사용하지 않습니다.
3. 특징·근거·도움과 한 문장 의미를 작성하고 **선생님께 제출**.
4. 교사 화면에 제출 표시가 나타나는지 확인합니다.
5. 전자칠판에서 같은 교사 Google 계정과 수업 코드로 입장합니다. 교사가 발표 모둠을 고르면 전자칠판이 그 발표를 보여 줍니다.
6. 제출 닫기 후에도 발표가 가능하고 학생의 새 제출은 차단되는지 확인합니다.

모둠 대표 기기를 바꿔야 하면 교사 화면에서 해당 모둠의 대표 기기를 재설정하고 새 링크를 전달합니다. 이전 링크는 더 이상 제출할 수 없습니다. 기존 제출물은 남습니다. 영화관을 다시 배정해도 이전 글을 지우지 않으며, 새 배정과 다른 제출물에는 재제출이 필요합니다.

## 접속 오류 점검

| 현상 | 확인할 곳 |
| --- | --- |
| 설정이 필요하다고 표시됨 | `app-config.js`의 다섯 항목과 `databaseURL` |
| Google 로그인이 차단됨 | Google 제공자 활성화, 승인된 도메인, 팝업 차단 |
| 학생이 들어가지 못함 | 익명 제공자 활성화, 최신 모둠 전용 링크, 대표 기기 중복·수업 만료 |
| 제출 권한이 없다고 표시됨 | 규칙 게시 여부, 제출 열림 상태, 현재 배정과 기록의 영화관 일치 여부 |
| 교사 화면에서 기존 수업이 열리지 않음 | 수업을 만든 Google 계정인지, 수업 코드가 맞는지 |
| 전자칠판에 제출이 갱신되지 않음 | 같은 Google 계정·수업 코드인지, 활성 탭인지, 인터넷 연결 |

## 로컬 보안 규칙 테스트

`tests/firebase_rules_rest_test.py`는 실제 Firebase 프로젝트에 쓰지 않고, 로컬 공식 Realtime Database Emulator에만 요청합니다. Java 21과 Firebase CLI가 있는 개발 환경에서 다음 순서로 확인합니다.

1. 이 폴더에서 `firebase emulators:start --only database --project demo-cinema-groups`를 실행합니다.
2. 다른 터미널에서 `python3 tests/firebase_rules_rest_test.py`를 실행합니다.
3. 테스트가 끝나면 에뮬레이터를 종료합니다.

2026-11-09에 공식 Realtime Database Emulator v4.11.2와 Java 21 환경에서 접근·검증 사례 41개를 통과했습니다. 실제 Firebase 프로젝트 연결이나 Google 로그인은 설정 후 별도로 확인해야 합니다.

테스트는 다른 모둠 읽기 차단, 토큰 검증, 대표 기기 중복, 영화관 배정, 글자 수, 이미지 데이터·알 수 없는 필드 차단, 원자적 버전 갱신, 닫힌 수업·만료 수업 및 교사 소유권을 확인합니다. 이는 실제 프로젝트의 로그인 설정이나 실제 배포 도메인까지 검증했다는 뜻은 아닙니다.

## 공식 안내

2026-11-09 확인:

- [웹 Firebase SDK 추가](https://firebase.google.com/docs/web/learn-more)
- [Google 로그인](https://firebase.google.com/docs/auth/web/google-signin)
- [익명 로그인](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Realtime Database 읽기·쓰기](https://firebase.google.com/docs/database/web/read-and-write)
- [보안 규칙](https://firebase.google.com/docs/database/security)
- [규칙의 상속과 문법](https://firebase.google.com/docs/database/security/core-syntax)
- [사용량 최적화](https://firebase.google.com/docs/database/usage/optimize)
- [사용량과 청구](https://firebase.google.com/docs/database/usage/billing)
