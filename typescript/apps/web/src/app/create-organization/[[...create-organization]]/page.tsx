import { CreateOrganization, OrganizationSwitcher } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return (
    <div className="flex flex-col items-center gap-2">
      <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
      <div className="flex flex-row gap-2">
        <span>Or select from an existing</span>
        <OrganizationSwitcher
          hidePersonal={true}
          afterCreateOrganizationUrl="/dashboard"
          afterSwitchOrganizationUrl="/dashboard"
        />
      </div>
    </div>
  );
}
