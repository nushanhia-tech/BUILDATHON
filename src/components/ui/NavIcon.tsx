import { Icon } from "./Icon";

export function NavIcon({ name }: { name: "home" | "family" | "settings" }) {
  return <Icon name={name === "family" ? "heart" : name} size={24} />;
}
