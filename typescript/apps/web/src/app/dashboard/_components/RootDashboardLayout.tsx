import { auth as clerkAuth } from "@clerk/nextjs";
import { Loader } from "lucide-react";

import Sidebar from "@/app/dashboard/_components/Sidebar";

export const RootDashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
  loadUserIndexes?: boolean;
}) => {
  return <MainComponent>{children}</MainComponent>;
};

// TODO: MOVE PROVIDERS TO OWN COMPONENT
const MainComponent = ({ children }: { children: React.ReactNode }) => {
  const auth = clerkAuth();

  if (!auth.orgId) {
    return <Loader />;
  }

  return (
    <main className="h-screen w-screen px-2">
      <div className="flex h-full w-full flex-row">
        <Sidebar orgId={auth.orgId} />
        <div className="w-[100%]">{children}</div>
      </div>
    </main>
  );
};
