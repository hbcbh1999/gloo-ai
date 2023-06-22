import { RootDashboardLayout } from "./_components/RootDashboardLayout";

export const metadata = {
  title: "Gloo Dashboard",
  description: "Gloo dashboard",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootDashboardLayout>{children}</RootDashboardLayout>;
}
