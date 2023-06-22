// "use client";

// import { H } from "highlight.run";
// import { useEffect } from "react";
// import { useAuth, useUser } from "@clerk/nextjs";
// import { HighlightInit } from "@highlight-run/next/highlight-init";

// export function HighlightClient() {
//   const { userId, orgId, orgSlug } = useAuth();
//   const { user } = useUser();

//   useEffect(() => {
//     // login logic...
//     if (userId) {
//       H.identify(userId, {
//         orgId: orgId ?? "UNSET",
//         orgSlug: orgSlug ?? "UNSET",
//         firstName: user?.firstName ?? "UNSET",
//         lastName: user?.lastName ?? "UNSET",
//         email: user?.emailAddresses[0]?.emailAddress ?? "UNSET",
//       });
//     } else {
//       H.identify("anonymous");
//     }
//   }, [user, userId, orgId, orgSlug]);

//   return (
//     <HighlightInit
//       projectId={"lgx14qdm"}
//       tracingOrigins
//       networkRecording={{
//         enabled: true,
//         recordHeadersAndBody: true,
//         urlBlocklist: [],
//       }}
//     />
//   ); // Or your app's rendering code.
// }
