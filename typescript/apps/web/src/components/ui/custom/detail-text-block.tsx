export const DetailTextBlock = ({
  title,
  text,
}: {
  title: string;
  text: string;
}) => {
  return (
    <div className="flex flex-col gap-y-1">
      <div className="text-xs font-medium text-primary/60 capitalize">
        {title}
      </div>
      <div className="text-xs">{text}</div>
    </div>
  );
};
