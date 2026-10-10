import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { loadManagedChurch } from "@/lib/dashboard";
import { listCities } from "@/lib/services/churches";
import { toProfileFormValues } from "@/lib/forms/profile-values";

export default async function EditListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, row, canManage } = await loadManagedChurch(slug, "/edit");
  const cities = await listCities({ includeEmpty: true });
  return (
    <>
      <ChurchTabs slug={slug} current="/edit" canManage={canManage} />
      <div className="mt-6">
        <ProfileForm values={toProfileFormValues(church, row)} cities={cities} enhanced={Boolean(church.enhancedProfile)} />
      </div>
    </>
  );
}
