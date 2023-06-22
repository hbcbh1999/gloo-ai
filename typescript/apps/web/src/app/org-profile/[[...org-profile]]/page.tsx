import { OrganizationProfile } from "@clerk/nextjs";

export default function OrganizationProfilePage() {
  <div className="flex h-screen w-full items-center justify-center">
    <OrganizationProfile routing="path" path="/org-profile" />;
  </div>;
}
