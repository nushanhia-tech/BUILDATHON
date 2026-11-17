import { useAuth } from "../../auth/AuthProvider";
import { MessageThread } from "../../components/managers/Messages";
import { useFamilyScope } from "./familyData";

export default function FamilyMessages() {
  const { profile } = useAuth();
  const { userId } = useFamilyScope();
  return <div className="max-w-2xl"><MessageThread me={profile!.id} other={userId} canRecord /></div>;
}
