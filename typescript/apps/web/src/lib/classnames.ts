export function classNames<T>(...classes: T[]) {
  return classes.filter(Boolean).join(" ");
}
