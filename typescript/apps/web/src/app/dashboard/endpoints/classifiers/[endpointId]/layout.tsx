import { currentUser } from "@clerk/nextjs";

import { getClassifier } from "@/app/actions/classifiers";
import { MainViewLayout } from "@/app/dashboard/endpoints/classifiers/[endpointId]/_components/EndpointMainView";
import { Button } from "@/components/ui/button";
import { TabGroup } from "@/components/ui/custom/tab-group";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import "allotment/dist/style.css";

export default async function EndpointLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { endpointId: string };
}) {
  const auth = await currentUser();
  const isSuperUser = !!auth?.emailAddresses.some((e) =>
    e.emailAddress.endsWith("@gloo.chat")
  );

  const classifier = await getClassifier(params.endpointId);

  const items = [
    { text: "Configurations", slug: "definition" },
    { text: "Evaluate", slug: "evaluate" },
    { text: "History", slug: "predictions" },
    { text: "Analytics", slug: "analytics" },
    { text: "Editor", slug: "playground" },
  ];
  if (isSuperUser) {
    items.push({ text: "Models (internal)", slug: "models" });
  }

  return (
    <div className="h-full w-full">
      <div className="max-h-screen w-full overflow-clip">
        <div className="bg-background">
          <div className="p-4">
            <h2 className="scroll-m-20 text-lg font-semibold tracking-tight transition-colors first:mt-0">
              <div className="flex flex-col gap-1 text-2xl">
                <div>
                  <div>{classifier.name}</div>
                </div>

                <div className="text-xs font-light tracking-wide text-muted-foreground/80">
                  {classifier.id}
                </div>
              </div>
              {/* <div className="text-primary/80">Classifier Endpoint</div> */}
            </h2>
          </div>
          {/* <EndpointTabs /> */}
          <div className="flex flex-row gap-x-4 p-2">
            <TabGroup
              path={`/dashboard/endpoints/classifiers/${params.endpointId}`}
              items={items}
            ></TabGroup>
            <QuickstartDialog />
          </div>

          <Separator />
        </div>

        <MainViewLayout>{children}</MainViewLayout>
        {/* {selectedTab === EndpointMenuItems.Definition && (
          <div className=" sticky -bottom-2 flex h-[260px] w-full border-t-[2px] border-t-muted bg-background px-8 py-10 pt-16">
            <CallClassifierComponent />
          </div>
        )} */}
      </div>
    </div>
  );
}

const QuickstartDialog = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <Button variant={"outline"}>Quickstart</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          <h2 className="text-xl font-bold">Quickstart</h2>
          <div>The typescript code below can get you started in 2 minutes.</div>
          <div className="flex flex-col gap-y-2">
            <CodeBlock>npm install @gloo/client-internal</CodeBlock>
            <CodeBlock>{codeChunk}</CodeBlock>
          </div>
        </DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
const codeChunk = `import Gloo from “@gloo/client-internal”

const glooClient = new Gloo({apiKey: “YOUR KEY”})
const classifier = glooClient.classifier(uuid-123-5461-233)
/*
 * or use a secific configuration
 * classifier = glooClient.classifier(uuid-123-5461-233, configId=”....”)
 */

const result = await classifier.predict({text: “My text”})
console.log(result)`;

const CodeBlock = ({ children }: { children: React.ReactNode }) => {
  return (
    <pre className="whitespace-pre-wrap rounded-md bg-muted/80 p-2 text-base font-normal">
      {children}
    </pre>
  );
};
