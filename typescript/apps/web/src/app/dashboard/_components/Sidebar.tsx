/* eslint-disable @next/next/no-sync-scripts */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs";

import { SidebarTab } from "./SidebarTab";

import { getClassifiers } from "@/app/actions/classifiers";

export default async function Sidebar({ orgId }: { orgId: string }) {
  const classifiers = await getClassifiers(orgId);
  const user = await currentUser();

  if (!user) {
    return null;
  }
  return (
    <div className="flex h-full w-[180px] min-w-[180px] flex-col gap-y-5 overflow-y-auto overflow-x-hidden border-r border-r-primary/10 bg-background px-2 pl-3">
      <div className="flex h-16 shrink-0 items-center">
        <Image
          className="hidden h-12 w-auto lg:block"
          src="/glooiconsquare.png"
          alt="Your Company"
          height={38}
          width={38}
        />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <SidePanelMenus classifiers={classifiers} />
          <li className="-mx-6 mt-auto gap-y-4 px-6">
            <OrganizationSwitcher
              hidePersonal={true}
              afterSwitchOrganizationUrl={"/dashboard/endpoints/create"}
            />

            <div className="flex items-center gap-x-4 py-4 text-sm font-semibold leading-6 text-foreground">
              {/* <img
                className="h-8 w-8 rounded-full bg-gray-50"
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt=""
              /> */}

              <UserButton />
              <span className="sr-only">Your profile</span>
              <span aria-hidden="true">{user.firstName}</span>
            </div>
          </li>
        </ul>
      </nav>
      {/* <script src="../path/to/flowbite/dist/flowbite.min.js"></script> */}
    </div>
  );
}

const SidePanelMenus: React.FC<{
  classifiers: Awaited<ReturnType<typeof getClassifiers>>;
}> = ({ classifiers }) => {
  const navigation: {
    name: string;
    href: string;
    children?: { name: string; href: string }[];
  }[] = [
    {
      name: "Endpoints",
      href: "/dashboard/endpoints/create",
      children: classifiers.map((classifier) => ({
        name: `${classifier.name}`,
        href: `/dashboard/endpoints/classifiers/${classifier.id}/definition`,
      })),
    },
    {
      name: "Keys",
      href: "/dashboard/api",
    },
    // {
    //   name: "Billing",
    //   href: "/dashboard/billing",
    //   icon: CurrencyDollarIcon,
    // },
  ];

  return (
    <li>
      <ul role="list" className="space-y-4">
        <Link
          className="hover:bg-secondaccent-primary-foreground p-1 text-sm font-semibold text-foreground/80 hover:text-foreground"
          href="/dashboard/endpoints/create"
        >
          Create Endpoint
        </Link>
        {navigation.map((item) => {
          // const isTopLeveItemActive = pathname?.includes(href);
          return (
            <li key={item.name}>
              {!item.children ? (
                <SidebarTab
                  path={item.href}
                  item={{
                    text: item.name,
                  }}
                />
              ) : (
                <div>
                  <>
                    <SidebarTab
                      path="/dashboard/endpoints/create"
                      item={{
                        text: item.name,
                      }}
                    />
                    <ul className="pl-7">
                      {item.children?.map((subItem) => (
                        <SidebarTab
                          classNames="flex font-light text-sm text-foreground/80 hover:text-foreground py-1 leading-6"
                          key={subItem.name}
                          path={subItem.href}
                          item={{
                            text: subItem.name,
                          }}
                        />
                      ))}
                    </ul>
                  </>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
};
