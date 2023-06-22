export const measureExecutionTime = <T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
) => {
  const wrappedFunction = async (...args: Args): Promise<T> => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    const duration = end - start;

    console.log(`Function ${fn.name} took: ${duration} ms`);
    return result;
  };

  return wrappedFunction;
};
