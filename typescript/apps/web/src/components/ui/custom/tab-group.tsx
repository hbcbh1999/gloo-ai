import { Tab } from "@/components/ui/custom/tab";

export type Item = {
  text: string;
  slug?: string;
  segment?: string;
};

export const TabGroup = ({ path, items }: { path: string; items: Item[] }) => {
  return (
    <div className="flex w-fit flex-wrap items-center justify-center gap-2 rounded-md bg-muted p-1 text-muted-foreground">
      {items.map((item) => (
        <Tab key={`${path}${item.slug ?? ""}`} item={item} path={path} />
      ))}
    </div>
  );
};
