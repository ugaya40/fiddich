export type NotFunction<T> = T extends Function ? never : T;

type UnionKeys<T> = T extends T ? keyof T : never;
type StrictUnionHelper<T, TAll> = T extends T ? T & Partial<Record<Exclude<UnionKeys<TAll>, keyof T>, undefined>> : never;
export type StrictUnion<T> = StrictUnionHelper<T, T>;

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
