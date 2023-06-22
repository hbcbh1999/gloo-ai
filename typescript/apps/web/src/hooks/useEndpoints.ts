import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useEffect } from "react";

export const useEndpoints = () => {
  const org = useOrganization();
  const organizationList = useOrganizationList();
  const orgId = org?.organization?.id;
  // const utils = api.useContext();

  useEffect(() => {
    if (!orgId) {
      const firstOrg = organizationList?.organizationList?.find(
        (o) => o.organization.id
      );
      if (firstOrg && organizationList?.setActive) {
        organizationList
          .setActive(firstOrg)
          .catch((e) => console.error("error setting active org", e));
      }
    }
  }, [orgId, organizationList]);
  // const { data: classifiers, refetch } =
  //   // api.classifiers.listClassifiers.useQuery(undefined, {
  //   //   // refetchOnMount: false,
  //   //   refetchInterval: false,
  //   //   refetchOnWindowFocus: false,
  //   //   refetchOnReconnect: false,
  //   //   refetchOnMount: false,
  //   // });

  // const prevOrgId = usePrevious(orgId);

  // useEffect(() => {
  //   const fn = async () => {
  //     console.log("invalidating queries!");
  //     // await utils.classifiers.listClassifiers.invalidate();
  //     await refetch();
  //     await router.push("/dashboard/home");
  //   };
  //   if (orgId && orgId !== prevOrgId && prevOrgId) {
  //     fn();
  //   }
  // }, [orgId]);

  return { classifiers: [], orgId };
};
