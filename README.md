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
  content/
    stats.ts items.ts     능력치 · 아이템 정의
    episodes/ep1.ts       에피소드 1 「유천당 입문」 + 랜덤 인카운터
  lib/                    클라이언트 소켓 훅 · 신원(localStorage)
  components/             SidePanel · Chat
  app/                    로비(/) · 게임 화면(/play/[code])
```

## 현재 구현 범위 (MVP)

- 2인 실시간 동기화 (Socket.IO room = 세션)
- 슬롯별 비대칭 서술/선택지 (비밀 정보는 서버에서만 보유, 클라이언트로 누출 없음)
- `both` 모드(둘 다 제출해야 진행) + `either` 모드(아무나 진행)
- 능력치(행동 3 / 감각·지식 3) · 아이템(개인 소유, 스탯과 독립, OR 조건 해금)
- 정보 교환형 협력 퍼즐 (305호)
- 랜덤 인카운터 3종 · 심령 활동 수위(글로벌 수치, 구조만)
- 게임 오버 → 체크포인트(거점)에서 재시작
- 접속 종료 시 일시정지, 재접속 시 같은 슬롯으로 복귀, 채팅

미구현(이후 확장): 피날레/엔딩 분기, 에피소드 2+, 영속 저장(현재 인메모리).
