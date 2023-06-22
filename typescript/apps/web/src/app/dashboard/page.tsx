import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { getClassifiers } from "../actions/classifiers";
export default async function Dashboard() {
  const orgId = auth().orgId;
  if (!orgId) {
    return <div>Not logged in</div>;
  }
  const classifiers = await getClassifiers(orgId);
  if (classifiers.length > 0) {
    const classifier = classifiers[0];
    redirect(`/dashboard/endpoints/classifiers/${classifier!.id}/predictions`);
  } else {
    redirect("/dashboard/endpoints/create");
  }
}
