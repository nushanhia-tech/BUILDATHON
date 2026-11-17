import type { ReactNode } from "react";

/**
 * Sa Hai icon set: duotone line icons (soft tinted fill + crisp stroke + a small
 * yellow accent taken from the logo). 24×24 grid, inherits currentColor.
 */
export type IconName =
  | "home" | "family" | "settings" | "logout" | "globe" | "speaker" | "mic" | "send" | "back" | "edit" | "trash"
  | "plus" | "check" | "close" | "phone" | "chat" | "camera" | "image" | "search" | "bell" | "map" | "list"
  | "bulb" | "compass" | "clock" | "pin" | "idcard" | "mail" | "user" | "users" | "lock" | "alert" | "pill"
  | "tasks" | "eye" | "ear" | "wheelchair" | "sos" | "heart" | "hand" | "box" | "gift" | "save" | "flag"
  | "link" | "block" | "play" | "stop" | "keyboard" | "board" | "undo" | "refresh" | "key" | "chart"
  | "puzzle" | "folder" | "ambulance" | "shield" | "sun" | "moon" | "sunrise" | "calendar" | "star" | "hourglass"
  | "water" | "smile" | "write" | "slow" | "doctor" | "toilet" | "sparkle";

const A = "var(--accent, #FFB90B)";
const tint = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" } as const;

const ICONS: Record<IconName, ReactNode> = {
  home: <><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" {...tint} /><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" /><path d="M10 20.5v-5.5h4v5.5" /><circle cx="17.5" cy="6" r="1.6" fill={A} stroke="none" /></>,
  family: <><circle cx="8.5" cy="8" r="3" {...tint} /><circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M3 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" /><path d="M14.2 15.3c.7-.5 1.5-.8 2.3-.8 2.2 0 3.9 1.5 4.4 4" /><circle cx="16.5" cy="9.5" r="1" fill={A} stroke="none" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" /><circle cx="15" cy="7" r="2" {...tint} /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" fill={A} stroke="none" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="17" r="2" /></>,
  logout: <><path d="M13 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h6" {...tint} /><path d="M13 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h6" /><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" /><circle cx="8" cy="12" r="1.3" fill={A} stroke="none" /></>,
  globe: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.3 2.4 3.4 5 3.4 8s-1.1 5.6-3.4 8c-2.3-2.4-3.4-5-3.4-8S9.7 6.4 12 4Z" /><circle cx="18" cy="6" r="1.5" fill={A} stroke="none" /></>,
  speaker: <><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3Z" {...tint} /><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3Z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" stroke={A} /></>,
  mic: <><rect x="9" y="3.5" width="6" height="11" rx="3" {...tint} /><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5M9 20.5h6" /><circle cx="12" cy="7.5" r="1.1" fill={A} stroke="none" /></>,
  send: <><path d="M4 11.5 20 4l-6 16-2.6-6.4Z" {...tint} /><path d="M4 11.5 20 4l-6 16-2.6-6.4Z" /><path d="m11.4 13.6 4-4" stroke={A} /></>,
  back: <><circle cx="12" cy="12" r="8" {...tint} /><path d="M14 7.5 9.5 12l4.5 4.5" /></>,
  edit: <><path d="m15.5 5 3.5 3.5L9 18.5l-4.5 1 1-4.5Z" {...tint} /><path d="m15.5 5 3.5 3.5L9 18.5l-4.5 1 1-4.5Z" /><path d="m13.5 7 3.5 3.5" /><path d="M13 19.5h6.5" stroke={A} /></>,
  trash: <><path d="M6.5 7.5h11l-.9 11a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8Z" {...tint} /><path d="M6.5 7.5h11l-.9 11a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8ZM4.5 7.5h15M9.5 7.5V5.2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2.3" /><path d="M10.5 11v5.5M13.5 11v5.5" stroke={A} /></>,
  plus: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></>,
  check: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="m8.2 12.3 2.6 2.6 5-5.4" /></>,
  close: <><circle cx="12" cy="12" r="8" {...tint} /><path d="m9 9 6 6M15 9l-6 6" /></>,
  phone: <><path d="M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" {...tint} /><path d="M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" /><path d="M15 4.5a5 5 0 0 1 4.5 4.5" stroke={A} /></>,
  chat: <><path d="M4.5 11.5a7.5 7 0 1 1 3.4 5.9L4.5 18.5l1-3.2a6.6 6.6 0 0 1-1-3.8Z" {...tint} /><path d="M4.5 11.5a7.5 7 0 1 1 3.4 5.9L4.5 18.5l1-3.2a6.6 6.6 0 0 1-1-3.8Z" /><circle cx="9" cy="11.5" r=".9" fill="currentColor" stroke="none" /><circle cx="12" cy="11.5" r=".9" fill={A} stroke="none" /><circle cx="15" cy="11.5" r=".9" fill="currentColor" stroke="none" /></>,
  camera: <><rect x="3.5" y="7" width="17" height="12" rx="2.5" {...tint} /><path d="M3.5 9.5A2.5 2.5 0 0 1 6 7h2l1.5-2.5h5L16 7h2a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5Z" /><circle cx="12" cy="13" r="3.3" /><circle cx="17.5" cy="10" r="1" fill={A} stroke="none" /></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="2.5" {...tint} /><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="m4.5 16.5 4.5-4.5 3.5 3.5 2.5-2.5 4.5 4" /><circle cx="15.5" cy="9" r="1.6" fill={A} stroke="none" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" {...tint} /><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /><path d="M8 9a3 3 0 0 1 2.5-1.5" stroke={A} /></>,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" {...tint} /><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /><circle cx="17.5" cy="5.5" r="2" fill={A} stroke="none" /></>,
  map: <><path d="m4 6.5 5-2 6 2 5-2v13l-5 2-6-2-5 2Z" {...tint} /><path d="m4 6.5 5-2 6 2 5-2v13l-5 2-6-2-5 2ZM9 4.5v13M15 6.5v13" /><circle cx="12" cy="11" r="1.4" fill={A} stroke="none" /></>,
  list: <><rect x="4" y="4.5" width="16" height="15" rx="3" {...tint} /><path d="M9.5 8.5h7M9.5 12h7M9.5 15.5h5" /><circle cx="6.8" cy="8.5" r="1" fill={A} stroke="none" /><circle cx="6.8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="6.8" cy="15.5" r="1" fill="currentColor" stroke="none" /></>,
  bulb: <><path d="M8.5 15.5a6 6 0 1 1 7 0V17h-7Z" {...tint} /><path d="M8.5 15.5a6 6 0 1 1 7 0V17h-7ZM9.5 20h5" /><path d="M12 8v4" stroke={A} /></>,
  compass: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="m15 9-2 4-4 2 2-4Z" fill={A} stroke={A} /></>,
  clock: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /><circle cx="12" cy="12" r="1" fill={A} stroke="none" /></>,
  pin: <><path d="M12 20.5s-6-5.4-6-10.5a6 6 0 0 1 12 0c0 5.1-6 10.5-6 10.5Z" {...tint} /><path d="M12 20.5s-6-5.4-6-10.5a6 6 0 0 1 12 0c0 5.1-6 10.5-6 10.5Z" /><circle cx="12" cy="10" r="2.2" fill={A} stroke="none" /></>,
  idcard: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...tint} /><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><circle cx="9" cy="11" r="2" /><path d="M6 15.5c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3" /><path d="M14 10h4" stroke={A} /></>,
  mail: <><rect x="3.5" y="6" width="17" height="12" rx="2.5" {...tint} /><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="m4 7.5 8 6 8-6" /><circle cx="18.5" cy="6" r="2" fill={A} stroke="none" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" {...tint} /><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /><circle cx="12" cy="8.5" r="1" fill={A} stroke="none" /></>,
  users: <><circle cx="9" cy="8.5" r="3" {...tint} /><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.6-3.1 2.8-4.8 5.5-4.8s4.9 1.7 5.5 4.8" /><path d="M15 5.8a3 3 0 0 1 0 5.4M17 14.6c2 .5 3.2 2 3.5 4.4" stroke={A} /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" {...tint} /><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><circle cx="12" cy="15.5" r="1.4" fill={A} stroke="none" /></>,
  alert: <><path d="M12 4 21 19.5H3Z" {...tint} /><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4" /><circle cx="12" cy="16.8" r="1" fill={A} stroke="none" /></>,
  pill: <><path d="M10.4 4.6a4.6 4.6 0 0 1 6.5 6.5l-5.8 5.8a4.6 4.6 0 0 1-6.5-6.5Z" {...tint} /><path d="M10.4 4.6a4.6 4.6 0 0 1 6.5 6.5l-5.8 5.8a4.6 4.6 0 0 1-6.5-6.5Z" /><path d="m7.5 7.5 6.5 6.5" /><path d="M13 6.5a2.4 2.4 0 0 1 3 .5" stroke={A} /></>,
  tasks: <><rect x="5" y="4" width="14" height="17" rx="2.5" {...tint} /><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 3v2.5h6V3" /><path d="m8.5 11 1.5 1.5 2.5-2.5" stroke={A} /><path d="M14 11.5h2M8.5 16h7" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...tint} /><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /><circle cx="12" cy="12" r="1.3" fill={A} stroke="none" /></>,
  ear: <><path d="M7 9.5a5.5 5.5 0 0 1 11 0c0 3-2.5 4-3 6.5-.4 2.2-1.8 4-4 4a3.6 3.6 0 0 1-3.5-2.8" {...tint} /><path d="M7 9.5a5.5 5.5 0 0 1 11 0c0 3-2.5 4-3 6.5-.4 2.2-1.8 4-4 4a3.6 3.6 0 0 1-3.5-2.8" /><path d="M10 9.8a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3.5" /><path d="M20 5.5a7 7 0 0 1 1 3.5" stroke={A} /></>,
  wheelchair: <><circle cx="10.5" cy="15.5" r="5" {...tint} /><circle cx="10.5" cy="15.5" r="5" /><circle cx="10" cy="4.5" r="1.6" fill={A} stroke="none" /><path d="M10 7.5v6h5.5l2.5 5.5h2M10 10.5h5" /></>,
  sos: <><path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6Z" {...tint} /><path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6Z" /><path d="M12 8.5v6M9 11.5h6" stroke={A} strokeWidth={2.2} /></>,
  heart: <><path d="M12 19.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" {...tint} /><path d="M12 19.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" /><path d="M8 10a2 2 0 0 1 2-1.8" stroke={A} /></>,
  hand: <><path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11V5a1.5 1.5 0 0 1 3 0v6V6.5a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5c-2.2 0-3.6-1-5-2.8L4.3 14a1.6 1.6 0 0 1 2.5-2Z" {...tint} /><path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11V5a1.5 1.5 0 0 1 3 0v6V6.5a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5c-2.2 0-3.6-1-5-2.8L4.3 14a1.6 1.6 0 0 1 2.5-2Z" /><circle cx="19.5" cy="4.5" r="1.3" fill={A} stroke="none" /></>,
  box: <><path d="m12 3.5 8 4v9l-8 4-8-4v-9Z" {...tint} /><path d="m12 3.5 8 4v9l-8 4-8-4v-9ZM4 7.5l8 4 8-4M12 11.5v9" /><path d="m8 5.5 8 4" stroke={A} /></>,
  gift: <><rect x="4.5" y="9.5" width="15" height="10.5" rx="2" {...tint} /><rect x="4.5" y="9.5" width="15" height="10.5" rx="2" /><path d="M3.5 9.5h17M12 9.5V20" /><path d="M12 9.5C10.5 6 7 5.5 7 7.5s3 2 5 2c2 0 5 0 5-2s-3.5-1.5-5 2Z" stroke={A} /></>,
  save: <><path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18Z" {...tint} /><path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18Z" /><path d="M8.5 4.5V9h6V4.5M8 19.5v-5h8v5" /><path d="M13 6v1.5" stroke={A} /></>,
  flag: <><path d="M6 4.5h11l-2.5 4 2.5 4H6Z" {...tint} /><path d="M6 20.5v-16h11l-2.5 4 2.5 4H6" /><circle cx="10" cy="8.5" r="1.2" fill={A} stroke="none" /></>,
  link: <><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" stroke={A} /></>,
  block: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="m6.5 6.5 11 11" stroke={A} /></>,
  play: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="M10 8.5v7l5.5-3.5Z" fill={A} stroke={A} /></>,
  stop: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><rect x="9" y="9" width="6" height="6" rx="1.2" fill={A} stroke={A} /></>,
  keyboard: <><rect x="3" y="6.5" width="18" height="11" rx="2.5" {...tint} /><rect x="3" y="6.5" width="18" height="11" rx="2.5" /><path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h.5M7.5 14h9" /><path d="M7.5 14h9" stroke={A} /></>,
  board: <><rect x="3.5" y="4.5" width="17" height="11" rx="2" {...tint} /><rect x="3.5" y="4.5" width="17" height="11" rx="2" /><path d="M12 15.5v4M8.5 20h7M7 8.5h7" /><path d="M7 11.5h10" stroke={A} /></>,
  undo: <><path d="M8 7 4.5 10.5 8 14" /><path d="M4.5 10.5H14a5 5 0 0 1 0 10h-3" stroke={A} /></>,
  refresh: <><path d="M19 12a7 7 0 1 1-2-5" /><path d="M19 4.5V8h-3.5" stroke={A} /></>,
  key: <><circle cx="8.5" cy="14.5" r="4" {...tint} /><circle cx="8.5" cy="14.5" r="4" /><path d="m11.5 11.5 8-8M16.5 6.5l2 2M14.5 8.5l1.5 1.5" /><circle cx="8.5" cy="14.5" r="1.2" fill={A} stroke="none" /></>,
  chart: <><rect x="4" y="4" width="16" height="16" rx="3" {...tint} /><path d="M8 16v-4M12 16V8M16 16v-6" /><path d="M16 16v-6" stroke={A} /></>,
  puzzle: <><path d="M5 8h3.5a2 2 0 1 1 4 0H16v3.5a2 2 0 1 1 0 4V19H5Z" {...tint} /><path d="M5 8h3.5a2 2 0 1 1 4 0H16v3.5a2 2 0 1 1 0 4V19H5Z" /><circle cx="10.5" cy="13.5" r="1.3" fill={A} stroke="none" /></>,
  folder: <><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5H10l2 2h6.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" {...tint} /><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5H10l2 2h6.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" /><path d="M7.5 12.5h9" stroke={A} /></>,
  ambulance: <><path d="M3 7.5h11v9.5H3ZM14 10.5h3.5l3 3.5v3h-6.5" {...tint} /><path d="M3 7.5h11v9.5H3ZM14 10.5h3.5l3 3.5v3h-6.5" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /><path d="M8.5 10v4M6.5 12h4" stroke={A} /></>,
  shield: <><path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6Z" {...tint} /><path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6Z" /><path d="m9 12 2 2 4-4" stroke={A} /></>,
  sun: <><circle cx="12" cy="12" r="4" fill={A} stroke={A} /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" /></>,
  moon: <><path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z" {...tint} /><path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z" /><circle cx="17" cy="6" r="1.2" fill={A} stroke="none" /></>,
  sunrise: <><path d="M7 17a5 5 0 0 1 10 0" fill={A} stroke={A} /><path d="M3.5 17h17M12 4.5v4M5.5 10.5l1.5 1.5M18.5 10.5 17 12M9.5 6.5 12 4l2.5 2.5" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" {...tint} /><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /><circle cx="15.5" cy="14.5" r="1.5" fill={A} stroke="none" /></>,
  star: <><path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.3L12 16.3l-4.8 2.5 1-5.3-4-3.8 5.4-.7Z" fill={A} fillOpacity={0.9} /><path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.3L12 16.3l-4.8 2.5 1-5.3-4-3.8 5.4-.7Z" /></>,
  hourglass: <><path d="M7 4h10M7 20h10M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8" /><path d="M9.5 18.5c.5-1.5 2.5-2.5 2.5-2.5s2 1 2.5 2.5Z" fill={A} stroke={A} /></>,
  water: <><path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" {...tint} /><path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" /><path d="M9 14.5a3 3 0 0 0 3 3" stroke={A} /></>,
  smile: <><circle cx="12" cy="12" r="8" {...tint} /><circle cx="12" cy="12" r="8" /><path d="M8.5 14a4 4 0 0 0 7 0" stroke={A} /><path d="M9.5 9.8v.4M14.5 9.8v.4" strokeWidth={2.2} /></>,
  write: <><path d="M5 19.5h14" stroke={A} /><path d="m14.5 4.5 3 3-8.5 8.5-3.8.8.8-3.8Z" {...tint} /><path d="m14.5 4.5 3 3-8.5 8.5-3.8.8.8-3.8Z" /></>,
  slow: <><path d="M4 16.5c0-4 3.5-7 7.5-7s7 3 7 6v1Z" {...tint} /><path d="M4 16.5c0-4 3.5-7 7.5-7s7 3 7 6v1Zm14.5-.5H20a1.5 1.5 0 0 0 0-3h-1" /><path d="M7 16.5v2M15 16.5v2" /><circle cx="11" cy="13" r="1.5" fill={A} stroke="none" /></>,
  doctor: <><circle cx="12" cy="7.5" r="3.5" {...tint} /><circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" /><path d="M12 15v3M10.5 16.5h3" stroke={A} /></>,
  toilet: <><path d="M6 4.5h5v6H6Z" {...tint} /><path d="M6 4.5h5v6H6ZM5 10.5h14a7 7 0 0 1-7 7v2.5H9v-3" /><circle cx="16.5" cy="6" r="1.5" fill={A} stroke="none" /></>,
  sparkle: <><path d="M12 4c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" {...tint} /><path d="M12 4c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" /><circle cx="18.5" cy="17.5" r="1.5" fill={A} stroke="none" /></>,
};

export function Icon({ name, size = 22, className = "", strokeWidth = 1.7 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      {ICONS[name]}
    </svg>
  );
}

/** Emoji used in strings/DB → icon. Unmapped emoji are dropped from labels. */
const EMOJI: Record<string, IconName> = {
  "🏠": "home", "👨‍👩‍👧": "family", "⚙️": "settings", "🚪": "logout", "🌐": "globe", "🔊": "speaker", "🎤": "mic", "🎙️": "mic",
  "➤": "send", "✏️": "edit", "🗑️": "trash", "➕": "plus", "+": "plus", "✔️": "check", "✅": "check", "✓": "check", "✖️": "close", "✕": "close",
  "📞": "phone", "☎️": "phone", "💬": "chat", "📷": "camera", "🖼️": "image", "🔍": "search", "🔎": "search", "🔔": "bell",
  "🗺️": "map", "📋": "list", "💡": "bulb", "🧭": "compass", "🕒": "clock", "📍": "pin", "🪪": "idcard", "✉️": "mail",
  "👤": "user", "👥": "users", "🔒": "lock", "⚠️": "alert", "💊": "pill", "👁️": "eye", "👀": "eye", "🦻": "ear", "👂": "ear",
  "♿": "wheelchair", "🦽": "wheelchair", "🦼": "wheelchair", "🆘": "sos", "💚": "heart", "❤️": "heart", "🤝": "hand", "✋": "hand",
  "🙋": "hand", "📦": "box", "💾": "save", "🚩": "flag", "🔗": "link", "🚫": "block", "▶️": "play", "⏹️": "stop", "⌨️": "keyboard",
  "🪧": "board", "↩️": "undo", "🔁": "refresh", "🔑": "key", "📊": "chart", "🧩": "puzzle", "🗂️": "folder", "🚑": "ambulance",
  "🗣️": "chat", "📇": "users", "✍️": "write", "🐢": "slow", "🙏": "hand", "🩺": "doctor", "🚻": "toilet", "💧": "water",
  "😊": "smile", "🤕": "alert", "🌅": "sunrise", "☀️": "sun", "🌙": "moon", "⭐": "star", "⏳": "hourglass", "📅": "calendar",
  "🤖": "sparkle", "📭": "mail", "🗒️": "list", "🔵": "pin", "🌑": "moon", "🌥️": "sun", "👴": "smile", "🔕": "bell", "📱": "phone", "🧪": "sparkle", "🔴": "stop", "☎": "phone", "🍲": "gift", "🎵": "star", "🏥": "doctor", "🏦": "folder", "📖": "list", "📻": "speaker", "🛒": "box", "🧘": "smile", "🚌": "map", "🚚": "box", "🎁": "gift", "🙌": "hand", "🙂": "smile",
};

/** Module key → icon (custom admin buttons fall back to their emoji map, then a link). */
export const MODULE_ICON: Record<string, IconName> = {
  medicines: "pill", tasks: "tasks", vision: "eye", hearing: "ear", wheelchair: "wheelchair", family_sos: "sos",
};
export function moduleIcon(key: string, emoji?: string | null): IconName {
  return MODULE_ICON[key] ?? (emoji && EMOJI[emoji]) ?? "link";
}

const LEAD = /^\s*((?:\p{Extended_Pictographic}|[➤✓✕+])️?(?:‍\p{Extended_Pictographic}️?)*)\s*/u;

/** Split a label like "🔊 വായിച്ചുതരൂ" into an icon name and clean text. */
export function splitLabel(label: string): { icon: IconName | null; text: string; stripped: boolean } {
  const m = label.match(LEAD);
  if (!m) return { icon: null, text: label, stripped: false };
  return { icon: EMOJI[m[1]] ?? null, text: label.slice(m[0].length), stripped: true };
}
export function iconFor(emoji: string | null | undefined): IconName | null {
  return emoji ? EMOJI[emoji] ?? null : null;
}

/** Renders a label with its leading emoji replaced by an icon. */
export function IconLabel({ label, size = 20, className = "" }: { label: string; size?: number; className?: string }) {
  const { icon, text } = splitLabel(label);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {icon && <Icon name={icon} size={size} />}
      <span>{text}</span>
    </span>
  );
}
