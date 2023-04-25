function generateRandomString(length: number): string {
  const array = new Uint8Array(Math.ceil(length / 2));
  window.crypto.getRandomValues(array);
  const hexArray = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2));
  const hexString = hexArray.join('');
  const truncatedHexString = hexString.slice(0, length);
  return truncatedHexString;
}

export const generateRandomKey = () => generateRandomString(16);

export function lazyFunction<TFunc extends (...args: any[]) => any>(func: () => TFunc): TFunc {
  let result: TFunc | undefined;
  return ((...args: any[]) => {
    if (result == null) {
      result = func();
    }
    return result(...args);
  }) as TFunc;
}
