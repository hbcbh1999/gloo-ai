import KlassInfo from "./KlassInfo";

import type { ClientKlass } from "@/app/actions/classifiers";

export default function KlassesPanel({ classes }: { classes: ClientKlass[] }) {
  if (classes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center pt-4">
        <div className="text-base font-semibold">No classes found!</div>
        <div className="text-base font-light text-center">
          To add classes to this classifier, create a new configuration in the
          Editor
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      {classes.map((klass) => (
        <KlassInfo klass={klass} key={klass.id} />
      ))}
    </div>
  );
}
