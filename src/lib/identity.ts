// 브라우저 영속 신원 — 재접속 시 같은 슬롯으로 복귀하기 위함

const PID_KEY = "yucheondang.playerId";
const NAME_KEY = "yucheondang.name";

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PID_KEY, id);
  }
  return id;
}

export function getName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name);
}
