import { getProfile } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div>
      <PageHeader eyebrow="Content" title="Profile" description="The bio, skills, stats, and contact details shown across the whole site." />
      <ProfileForm profile={profile} />
    </div>
  );
}
