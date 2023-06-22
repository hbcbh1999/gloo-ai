import { auth } from "@clerk/nextjs";

import { DeleteKeyButton } from "./_components/DeleteKeyButton";
import { CreateKeyButton } from "./_components/CreateKeyButton";
import { LLMKeyDialog } from "./_components/LLMKeyEdit";

import { getLLMKeysSafe, getOrgSecrets } from "@/app/actions/secrets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// do this until we have the orgSlug in the url so it automatically relvaidates.
// since right now it keeps caching the page even if you switch orgs since the url is the same.
export const dynamic = "force-dynamic";

export default async function API() {
  const orgId = auth().orgId;

  if (!orgId) {
    return <p>No org set.</p>;
  }

  const keys = await getLLMKeysSafe(orgId);

  return (
    <div className="p-5">
      <div className="p-4">
        <h2 className="scroll-m-20  pb-2 text-2xl font-semibold tracking-tight transition-colors first:mt-0">
          API Keys
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:flex-row">
        <ConfigurationTable keys={keys} orgId={orgId} />
        <SecretsTable />
      </div>
    </div>
  );
}

const ConfigurationTable: React.FC<{
  keys: Awaited<ReturnType<typeof getLLMKeysSafe>>;
  orgId: string;
}> = ({ keys, orgId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM API Configs</CardTitle>
        <p className="font-light">
          Add your own OpenAI, Azure, or other supported provider keys to get
          started. Custom endpoints coming soon!
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Key</TableHead>
          </TableHeader>
          <TableBody>
            {keys.map((k) => {
              return (
                <TableRow key={k.name}>
                  <TableCell className="font-semibold text-left">
                    {k.name}
                  </TableCell>
                  <TableCell>{k.provider}</TableCell>
                  <TableCell>
                    <span>{k.apiKey ?? "UNSET"}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <LLMKeyDialog orgId={orgId} />
      </CardContent>
    </Card>
  );
};

// const StripeIntegration = () => {
//   const { organization } = useOrganization();
//   const orgId = organization?.id;
//   const orgName = organization?.name;

//   const { data } = api.orgs.getOrg.useQuery(undefined, {
//     queryHash: `org-query-${orgId}`,
//     refetchOnMount: false,
//     refetchInterval: false,
//     refetchOnWindowFocus: false,
//     refetchOnReconnect: false,
//     retry: false,
//   });

//   const { mutateAsync: createOrg } = api.orgs.createOrg.useMutation();

//   // Org doesn't exist, so give the user a chance to create it
//   return (
//     <Card>
//       <Title>Account Setup</Title>
//       <Text className="mt-2">
//         Plan for <b>{orgName}</b>
//       </Text>
//       {data?.stripeCustomerId === undefined ? (
//         <div className="flex flex-col py-6">
//           <button
//             type="button"
//             className="w-fit rounded-md px-8 py-2 text-purple-500 shadow-md outline outline-1 outline-purple-500 hover:bg-purple-100 disabled:text-gray-400 disabled:outline-gray-400"
//             disabled={false}
//             // eslint-disable-next-line @typescript-eslint/no-misused-promises
//             onClick={async () => {
//               await createOrg({ name: orgName });
//             }}
//           >
//             Enable API
//           </button>
//         </div>
//       ) : (
//         <div className="flex flex-col gap-2">
//           <div className="flex flex-row gap-2">
//             <Text>Stripe Customer Id</Text>
//             <Badge className="bg-secondary-foreground">
//               {data.stripeCustomerId ?? "Not set"}
//             </Badge>
//           </div>
//           <div className="flex flex-row gap-2">
//             <Text>Stripe Subscription Id</Text>
//             <Badge className="bg-secondary-foreground">
//               {data.stripeSubscriptionId ?? "Not set"}
//             </Badge>
//           </div>
//         </div>
//       )}
//     </Card>
//   );
// };

async function SecretsTable() {
  // const orgName = useOrganization()?.organization?.name;
  const clerkAuth = auth();
  const orgName = clerkAuth.sessionClaims?.org_name as string;

  const orgId = clerkAuth.orgId;
  if (!orgId) {
    return <div>Not logged in</div>;
  }

  const secrets = await getOrgSecrets(orgId);

  return (
    <>
      <Card className="max-w-md p-4">
        <CardTitle>
          <div className="flex w-full flex-row items-center justify-between space-x-2">
            <div className="flex flex-row gap-x-2">
              <div>Secrets</div>
              <Badge>{secrets?.length.toString() ?? ""}</Badge>
            </div>
            <div className="pl-8">
              <CreateKeyButton orgId={orgId} />
            </div>
          </div>
        </CardTitle>
        <CardContent>
          <div className="flex flex-col py-6"></div>
          <div className="mt-2">
            Secrets for <b>{orgName}</b>
          </div>
          {secrets?.length === 0 ? (
            <div className="text-base text-gray-500">
              No secrets yet... create a new one to get started
            </div>
          ) : (
            <Table className="mt-6">
              <TableHeader>
                <TableRow>
                  <TableCell>Name</TableCell>
                  {/* <TableHeaderCell>Scopes</TableHeaderCell> */}
                </TableRow>
              </TableHeader>

              <TableBody>
                {secrets?.map((secret) => (
                  <TableRow key={secret.secretId}>
                    <TableCell>{secret.name}</TableCell>
                    <TableCell>
                      <DeleteKeyButton
                        secretKeyId={secret.secretId}
                        orgId={orgId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// const CreateApiKeyModal: React.FC<{
//   openModal: boolean;
//   setModal: (open: boolean) => void;
// }> = ({ openModal, setModal }) => {
//   const [secretName, setSecretName] = useState<string>("Default");
//   const [actualSecret, setActualSecret] = useState<string | undefined>();
//   const createSecretMutation = api.secrets.createOrgSecret.useMutation({
//     onSuccess: (s) => {
//       setActualSecret(s.secretKey);
//     },
//   });
//   useEffect(() => {
//     if (!openModal) {
//       setActualSecret(undefined);
//       setSecretName("Default");
//     }
//   }, [openModal]);

//   return (
//     <DialogContent className="relative w-fit min-w-[25%] transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-fit sm:max-w-[80%] sm:p-6">
//       {actualSecret ? (
//         <ShowAPIKey setModal={setModal} secretKey={actualSecret} />
//       ) : (
//         <>
//           <div>
//             <div className="mt-3 text-center sm:mt-5">
//               <DialogTitle className="text-base font-semibold leading-6 text-gray-900">
//                 Create Secret
//               </DialogTitle>
//               <div className="mt-2 flex flex-col gap-2">
//                 <div className="text-left text-xs font-semibold">
//                   Secret name
//                 </div>
//                 <TextInput
//                   placeholder="Secret name"
//                   value={secretName}
//                   onChange={(e) => setSecretName(e.target.value)}
//                 />
//               </div>
//             </div>
//           </div>
//           <div className="mx-auto mt-5 max-w-fit sm:mt-6">
//             <button
//               type="button"
//               className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
//               onClick={() => {
//                 createSecretMutation
//                   .mutateAsync({
//                     name: secretName,
//                     appScope: "ALL",
//                   })
//                   .catch(console.log);
//               }}
//             >
//               Create Secret
//             </button>
//           </div>
//         </>
//       )}
//     </DialogContent>
//   );
// };

// function ShowAPIKey({
//   secretKey,
//   setModal,
// }: {
//   secretKey: string;
//   setModal: (open: boolean) => void;
// }) {
//   return (
//     <>
//       <div>
//         <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
//           <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
//         </div>
//         <div className="mt-3 text-center sm:mt-5">
//           <DialogTitle className="text-base font-semibold leading-6 text-gray-900">
//             API Key Created
//           </DialogTitle>
//           <div className="mt-2">
//             <p className="text-sm text-gray-500">
//               Store your secret key in a safe location. You will not be able to
//               see the secret key after this dialogue is closed.
//             </p>
//             <div className="flex flex-col gap-y-4 py-2">
//               <div className="flex flex-col gap-y-1">
//                 <div className="font-bold text-gray-800">Secret Key</div>
//                 <div className="overflow-x-clip truncate whitespace-pre rounded-full bg-gray-100 px-2 py-1 font-mono text-red-500">
//                   {secretKey}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//       <div className="mx-auto mt-5 max-w-fit sm:mt-6">
//         <button
//           type="button"
//           className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
//           onClick={() => setModal(false)}
//         >
//           Go back to dashboard
//         </button>
//       </div>
//     </>
//   );
// }
