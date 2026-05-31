import type { Scene } from "../game/types";

// 코드 정의 연결 장면 — 에피소드와 랜덤 인카운터를 잇는 거점/후일담.
// (동료 JSON은 선형 에피소드라 허브가 없으므로 여기서 보강한다.)
export const HUB_SCENES: Scene[] = [
  {
    id: "hub",
    title: "유천당 — 거점",
    mode: "both",
    text: {
      shared:
        "입문을 마쳤다. 이제 둘은 한 조다.\n특별한 의뢰가 없는 밤엔, 거리를 걸으며 도시의 결을 익힌다. 무엇과 마주칠지는 아무도 모른다.",
    },
    choices: [
      { id: "hub_walk", slot: "both", label: "거리를 걷는다 (예상치 못한 사건)", goto: "@random" },
    ],
    // both 모드는 goto가 아닌 defaultGoto로 라우팅한다
    defaultGoto: "@random",
  },
  {
    id: "enc_aftermath",
    mode: "both",
    text: {
      shared: "밤은 다시 평범한 얼굴로 돌아간다.",
    },
    choices: [{ id: "enc_aftermath_cont", slot: "both", label: "계속 걷는다", goto: "hub" }],
    defaultGoto: "hub",
  },
];
