export const TokensUsed = ({ tokens }: { tokens: number }) => {
  return (
    <div className="flex flex-row gap-x-2 text-sm font-light text-muted-foreground">
      <div className="font-semibold text-foreground">{tokens}</div>tokens
    </div>
  );
};
