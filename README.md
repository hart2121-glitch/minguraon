# 유천당 (minguraon)

2인 실시간 협력 텍스트 어드벤처. 현대 서울, 심령·퇴마·헌터의 세계관.
두 플레이어가 **같은 장면에서 서로 다른 것을 보고**, 채팅으로 단서를 나눠 협력 퍼즐을 푼다.

설계 문서: [PRD.md](./PRD.md)

## 실행

> ⚠️ 이 환경에서는 `node`가 PATH에 없습니다. 명령 앞에 경로를 추가하거나, 아래처럼 PATH를 먼저 잡으세요.

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"

npm install      # 최초 1회
npm run dev      # http://localhost:3000
```

### 2인 플레이 방법
1. 브라우저로 `http://localhost:3000` 접속 → 이름 입력 → **새 세션 만들기**
2. 표시된 **세션 코드**를 상대(또는 다른 브라우저 프로필/시크릿 창)에게 전달
3. 상대가 같은 코드로 **참가**
4. 둘 다 접속하면 이야기가 시작된다

## 검증

```powershell
npm run typecheck                  # 타입 체크
npx tsx scripts/smoke.ts           # 2인 플레이 종단 테스트 (서버 실행 중이어야 함)
```

## 배포 (도메인으로 접속)

이 앱은 **WebSocket 연결을 유지하는 장기 실행 Node 서버**(`server.ts`)다. 정적/서버리스
호스팅(Vercel, Netlify, Firebase Hosting)으로는 못 띄운다. Node 컨테이너를 상시 구동하고
WebSocket과 HTTPS 도메인을 지원하는 **Railway**(추천) 또는 **Render**를 쓴다.

> ⚠️ 세션이 **인메모리**(`src/game/sessions.ts`)다. 인스턴스를 1개로만 유지할 것.
> 오토스케일/다중 레플리카로 늘리면 세션이 인스턴스별로 갈라진다.

### Railway (추천 — 강제 슬립 없음)
1. GitHub에 푸시 → [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Railway가 자동 감지: Build `npm run build`, Start `npm start`
3. **Settings → Networking → Generate Domain** 으로 `*.up.railway.app` 도메인 발급
4. `PORT`는 Railway가 자동 주입(서버가 `process.env.PORT` 사용). 커스텀 도메인은
   Settings → Networking에서 연결

### Render (무료 가능, 단 무료는 15분 무활동 시 슬립 → 콜드 스타트)
- 리포지토리에 포함된 `render.yaml`로 Blueprint 배포하거나, 수동 Web Service 생성 시
  Build `npm install && npm run build`, Start `npm start`, Instances `1`

### 배포 전 체크
```powershell
npm run build                      # 프로덕션 빌드 통과 확인 (배포가 이걸 실행)
$env:NODE_ENV="production"; $env:PORT="3100"; npm start   # 로컬에서 프로덕션 모드 부팅 확인
```

## 구조

```
server.ts                 커스텀 서버 (Next.js + Socket.IO)
src/
  game/
    types.ts              도메인 타입 (클라이언트/서버 공유)
    engine.ts             권위 게임 로직: 조건 평가 · 효과 · 장면 전이 · 슬롯별 뷰 투영
    sessions.ts           인메모리 세션 스토어 (생성/참가/재접속/일시정지/채팅)
  server/socket.ts        Socket.IO 핸들러
  shared/events.ts        소켓 이벤트 계약
  content/                ★ 콘텐츠는 모두 여기서 관리
    index.ts              레지스트리: 어댑터 결과 + 허브를 모아 장면/아이템/시작점 조립
    adapter.ts            콘텐츠 JSON → 엔진 Scene[] 변환 (한글 스탯명·분기·퍼즐·보상 흡수)
    hub.ts                거점/후일담 등 코드 정의 연결 장면
    stats.ts              능력치 정의 (행동 3 / 감각·지식 3)
    data/
      episodes/ep1.json   에피소드 1 「접선」 (+ 시나리오 md)
      encounters/random.json  랜덤 인카운터 (+ 시나리오 md)
  lib/                    클라이언트 소켓 훅 · 신원(localStorage)
  components/             SidePanel · Chat
  app/                    로비(/) · 게임 화면(/play/[code])
```

### 콘텐츠 추가 방법
새 에피소드/인카운터는 `src/content/data/` 아래 JSON으로 작성하고 `content/index.ts`에
한 줄 등록하면 어댑터가 엔진 형식으로 변환합니다. 엔진/서버 코드는 건드릴 필요가 없습니다.
어댑터가 흡수하는 JSON 기능: `visibility`(player_A/B/shared/split/server_only),
`branch_check`(플래그 분기), `puzzle`(정보교환), `rewards`(진입 보상), 병렬 도입부 병합,
선택 후 결과 서술, 한글 스탯명.

## 현재 구현 범위 (MVP)

- 2인 실시간 동기화 (Socket.IO room = 세션)
- 슬롯별 비대칭 서술/선택지 (비밀 정보는 서버에서만 보유, 클라이언트로 누출 없음)
- `both` 모드(둘 다 제출해야 진행) + `either` 모드(아무나 진행)
- 능력치(행동 3 / 감각·지식 3) · 아이템(개인 소유, 스탯과 독립, OR 조건 해금)
- 정보 교환형 협력 퍼즐 (합정동 폐상가 2층 — 공간 분리 split)
- 서버 전용 분기 판정(branch_check): 완전 성공 / 부분 성공 / 실패
- 랜덤 인카운터 3종 · 심령 활동 수위(글로벌 수치, 구조만)
- 게임 오버 → 에피소드 진입 체크포인트에서 재시작 (스탯·아이템 복구)
- 접속 종료 시 일시정지, 재접속 시 같은 슬롯으로 복귀, 채팅

미구현(이후 확장): 피날레/엔딩 분기, 에피소드 2+, 영속 저장(현재 인메모리).
