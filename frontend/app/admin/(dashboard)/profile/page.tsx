import { getProfile } from "@/lib/data";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
