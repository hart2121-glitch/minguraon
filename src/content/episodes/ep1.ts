import type { Scene } from "../../game/types";

// 에피소드 1 — 「유천당」 입문
// 흐름: 각자 도착 → 첫 만남/조직 소개 → 임무 브리핑 → (허브) → 고시원 협력 퍼즐 → 결말
// 허브에서는 랜덤 인카운터로 거리를 떠돌며 능력치를 키울 수 있다.

export const EP1_SCENES: Scene[] = [
  // ── 1. 각자 도착 (비대칭 서술, 둘 다 진입해야 진행) ──
  {
    id: "ep1_arrival",
    title: "늦은 밤, 종로 3가",
    mode: "both",
    text: {
      perSlot: [
        "모르는 번호로 온 문자 한 통.\n『당신은 보는 눈이 있더군요. 종로 3가 뒷골목, 「유천당」으로 오세요. — 관리인』\n\n홀린 듯 걸어와, 「유천당」이라 빛바랜 간판이 걸린 낡은 철문 앞에 섰다.",
        "사흘째 같은 꿈을 꿨다. 깨어보니 손바닥에 적힌 주소.\n『종로 3가 「유천당」』\n\n지워도 지워지지 않던 글씨. 그 자리에 와보니, 낡은 철문 위로 「유천당」이라 빛바랜 간판이 걸려 있다.",
      ],
    },
    choices: [
      { id: "enter0", slot: 0, label: "철문을 민다" },
      { id: "enter1", slot: 1, label: "철문을 민다" },
    ],
    defaultGoto: "ep1_meet",
  },

  // ── 2. 첫 만남 + 조직 소개 (공유 서술, 각자 첫 감각 스탯 분화) ──
  {
    id: "ep1_meet",
    title: "유천당",
    mode: "both",
    text: {
      shared:
        "삐걱이는 문 안쪽은 한약방 같기도, 골동품 가게 같기도 했다. 향 냄새. 천장까지 쌓인 부적과 낡은 물건들.\n\n그 가운데 백발의 노파가 앉아 차를 따른다. — 관리인.\n「둘 다 왔군. 서로 초면이지? …상관없어. 오늘부터 둘이 한 조다.」\n\n관리인은 말한다. 세상엔 보이지 않는 것들이 있고, 그걸 보는 자들이 그늘에서 서로를 돕는다고. 간판도 회비도 없는 느슨한 패거리 — 그게 「유천당」을 거쳐 가는 자경단이라고.\n「자, 너희가 뭘 타고났는지부터 보자. 이 방에서, 가장 먼저 눈이 가는 곳은?」",
    },
    choices: [
      { id: "meet_eye", slot: "both", label: "관리인의 눈을 똑바로 본다", effects: [{ type: "stat", stat: "spiritSight", delta: 1, target: "self" }] },
      { id: "meet_charm", slot: "both", label: "벽을 메운 부적들을 살핀다", effects: [{ type: "stat", stat: "occultLore", delta: 1, target: "self" }] },
      { id: "meet_tone", slot: "both", label: "관리인의 말투와 손짓을 읽는다", effects: [{ type: "stat", stat: "psychology", delta: 1, target: "self" }] },
    ],
    defaultGoto: "ep1_brief",
  },

  // ── 3. 임무 브리핑 (공유, 아무나 진행) ──
  {
    id: "ep1_brief",
    title: "첫 임무",
    mode: "either",
    text: {
      shared:
        "관리인은 종이쪽지 하나를 민다.\n「근처 별빛고시원 305호. 사흘 전 살던 아이가 사라졌어. 옆방 사람들은 밤마다 벽 긁는 소리를 듣는다더군.」\n「가서, 무엇이 남아 있는지 보고 와. ……아 참.」\n관리인이 노란 부적 두 장을 건넨다. 「한 번은 너희를 지켜줄 거다.」",
    },
    choices: [
      {
        id: "brief_go",
        slot: "both",
        label: "부적을 받고 길을 나선다",
        effects: [{ type: "giveItem", itemId: "talisman", target: "both" }],
        goto: "hub",
      },
    ],
  },

  // ── 4. 허브 — 유천당 거점 (체크포인트) ──
  {
    id: "hub",
    title: "유천당 — 거점",
    mode: "either",
    checkpoint: true,
    text: {
      shared:
        "낡은 탁자에 지도가 펼쳐져 있다. 별빛고시원에 빨간 동그라미.\n서두를 것 없다. 거리를 좀 더 익혀도 좋고, 바로 고시원으로 향해도 좋다.",
    },
    choices: [
      { id: "hub_walk", slot: "both", label: "거리를 걸으며 분위기를 살핀다", goto: "@random" },
      { id: "hub_case", slot: "both", label: "별빛고시원 305호로 향한다", goto: "ep1_goshiwon" },
    ],
  },

  // ── 5. 협력 퍼즐 — 305호 (비대칭 서술 + 정보 교환) ──
  {
    id: "ep1_goshiwon",
    title: "별빛고시원 305호",
    mode: "both",
    text: {
      perSlot: [
        // slot0 — 령안 계열 시야: 영적 단서
        "305호. 공기가 차다.\n벽지 위로 핏기 없는 손자국이 천천히 떠오른다 — 하나, 둘, 셋, 네 개.\n벽 너머에서 여자아이의 목소리가 또박또박 숫자를 센다.\n「…둘, 아홉, 셋, 다섯…」\n다시, 또다시. 같은 순서로.",
        // slot1 — 물리/탐색 계열 시야: 물증
        "305호. 곰팡이 냄새.\n책상 서랍에 다이얼 자물쇠가 달린 일기장이 있다. 자물쇠는 네 자리 숫자.\n벽엔 못 자국만 남은 빈 액자. 그 뒤편에 누군가 적어두었다.\n『아이의 말을 거꾸로 들어라.』",
      ],
    },
    choices: [
      // slot0 — 본 것을 어떻게 다룰지
      { id: "ep1_relay", slot: 0, label: "본 것을 차분히 파트너에게 전한다" },
      {
        id: "ep1_talk",
        slot: 0,
        label: "아이에게 직접 말을 건다 (령안 1+)",
        requires: { stats: { spiritSight: 1 } },
        lockedHint: "령안이 부족하다",
        effects: [{ type: "spiritLevel", delta: 1 }],
      },
      { id: "ep1_flee", slot: 0, label: "오싹함을 못 견디고 방을 뛰쳐나간다" },
      // slot1 — 자물쇠 네 자리 입력 (정답은 거꾸로 들은 5392)
      { id: "code_5392", slot: 1, label: "자물쇠에 5392를 맞춘다" },
      { id: "code_2935", slot: 1, label: "자물쇠에 2935를 맞춘다" },
      { id: "code_3529", slot: 1, label: "자물쇠에 3529를 맞춘다" },
      { id: "code_hold", slot: 1, label: "아직 맞추지 않고 파트너와 더 의논한다" },
    ],
    resolution: [
      { when: ["ep1_flee", "*"], goto: "ep1_flee_over" },
      { when: ["*", "code_5392"], goto: "ep1_resolve_good" },
      { when: ["*", "code_2935"], goto: "ep1_fail_over" },
      { when: ["*", "code_3529"], goto: "ep1_fail_over" },
    ],
    // code_hold 등 미매칭은 다시 305호로 — 채팅으로 의논 후 재시도
    defaultGoto: "ep1_goshiwon",
  },

  // ── 6a. 성공 ──
  {
    id: "ep1_resolve_good",
    title: "딸깍.",
    mode: "either",
    text: {
      shared:
        "자물쇠가 풀린다. 동시에 벽의 손자국이, 차갑던 공기가, 거짓말처럼 걷힌다.\n일기장 마지막 장 — 아이는 누군가를 기다리고 있었다. 거꾸로 센 숫자는, 아무도 들어주지 않던 작별 인사였다.\n둘은 처음으로, 말없이 서로를 마주봤다. 통한 것이다.",
    },
    choices: [
      {
        id: "good_back",
        slot: "both",
        label: "일기장을 챙겨 유천당으로 돌아간다",
        effects: [
          { type: "giveItem", itemId: "diary", target: 1 },
          { type: "stat", stat: "occultLore", delta: 1, target: 0 },
          { type: "stat", stat: "investigation", delta: 1, target: 1 },
          { type: "spiritLevel", delta: -1 },
          { type: "flag", flag: "ep1_clear", value: true },
        ],
        goto: "ep1_end",
      },
    ],
  },

  // ── 6b. 결말 ──
  {
    id: "ep1_end",
    title: "— 에피소드 1 끝 —",
    mode: "either",
    ending: true,
    text: {
      shared:
        "유천당. 관리인은 일기장을 오래 들여다보더니 고개를 끄덕였다.\n「초면인 것 치곤 손발이 맞았어. ……이제 둘은 한 조다.」\n\n돌아가는 길, 서울의 밤하늘이 평소보다 탁해 보인다. 보이지 않던 것들이, 조금씩 깨어나고 있었다.\n\n(여기까지가 플레이 가능한 첫 조각입니다.)",
    },
    choices: [],
  },

  // ── 6c. 실패: 잘못된 코드 ──
  {
    id: "ep1_fail_over",
    title: "철컥— 쩌적.",
    mode: "either",
    text: {
      shared:
        "틀린 숫자. 자물쇠 대신, 방의 온도가 곤두박질친다.\n벽의 손자국이 일제히 손바닥을 편다. 여자아이의 목소리가 더는 숫자를 세지 않는다 — 비명을 지른다.\n둘은 그 방에서, 함께 길을 잃었다.",
    },
    choices: [],
  },

  // ── 6d. 실패: 도주 ──
  {
    id: "ep1_flee_over",
    title: "혼자 남겨두고.",
    mode: "either",
    text: {
      shared:
        "한 명이 방을 뛰쳐나간 순간, 305호의 문이 저절로 닫혔다.\n남겨진 자의 비명이 복도를 울리고, 곧 아무 소리도 들리지 않았다.\n협력은, 한쪽이 등을 돌리는 순간 무너진다.",
    },
    choices: [],
  },
];

// ── 랜덤 인카운터 풀 (언제 나와도 자연스러운 생활밀착형 사건) ──
export const ENCOUNTER_SCENES: Scene[] = [
  {
    id: "enc_money",
    title: "골목길",
    mode: "both",
    text: {
      shared:
        "어둑한 골목, 만 원짜리 한 장이 바람에 굴러와 발치에 멈춘다. 주위엔 아무도 없다.",
    },
    choices: [
      { id: "money_take", slot: "both", label: "줍는다", effects: [{ type: "giveItem", itemId: "crumpled_bill", target: "self" }] },
      { id: "money_leave", slot: "both", label: "찜찜해서 그냥 지나친다", effects: [{ type: "stat", stat: "psychology", delta: 1, target: "self" }] },
    ],
    defaultGoto: "hub",
  },
  {
    id: "enc_corpse",
    title: "재개발 구역",
    mode: "both",
    text: {
      shared:
        "철거 직전의 공터. 거적 한 귀퉁이로 창백한 발 하나가 삐져나와 있다. 도시의 소음이 여기선 들리지 않는다.",
    },
    choices: [
      {
        id: "corpse_look",
        slot: "both",
        label: "거적을 들춰 살펴본다",
        effects: [
          { type: "giveItem", itemId: "cold_coin", target: "self" },
          { type: "stat", stat: "investigation", delta: 1, target: "self" },
          { type: "spiritLevel", delta: 1 },
        ],
      },
      { id: "corpse_pray", slot: "both", label: "손을 모아 잠시 명복을 빈다", effects: [{ type: "stat", stat: "spiritSight", delta: 1, target: "self" }] },
      { id: "corpse_leave", slot: "both", label: "못 본 척 자리를 뜬다" },
    ],
    defaultGoto: "hub",
  },
  {
    id: "enc_rumor",
    title: "포장마차",
    mode: "both",
    text: {
      shared:
        "포장마차 한 켠, 라디오에서 심야 괴담 코너가 흘러나온다. 제보자의 목소리가 유난히 떨린다.",
    },
    choices: [
      { id: "rumor_listen", slot: "both", label: "귀를 기울여 끝까지 듣는다", effects: [{ type: "stat", stat: "occultLore", delta: 1, target: "self" }] },
      { id: "rumor_talk", slot: "both", label: "주인장에게 동네 소문을 캐묻는다", effects: [{ type: "stat", stat: "negotiation", delta: 1, target: "self" }] },
    ],
    defaultGoto: "hub",
  },
];
