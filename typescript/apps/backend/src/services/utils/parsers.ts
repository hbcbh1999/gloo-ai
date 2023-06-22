const getOrDefault = (
  value: string | undefined,
  defaultValue: string | null | undefined
): string | null => {
  if (value === "default" || value === undefined) {
    return defaultValue ?? null;
  }
  if (value === "none") {
    return null;
  }
  return value;
};

function notEmpty<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  return true;
}

export { getOrDefault, notEmpty };
