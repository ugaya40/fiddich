import { atom, FiddichRoot, selector, useFiddichValue } from "fiddich";
import { FC, Suspense } from "react";
import { sleep } from "./share";

const AtomState = atom({
  key: '1',
  default: new Promise<string>((r) => {
    console.log('start atom get');
    setTimeout(() => {
      console.log('end atom get');
      r('ok');
    }, 3000);
  }),
});

const SourceSelector = selector({
  key: 'source',
  get: async ({ get }) => {
    console.log('start selector get');
    const atom1 = get(AtomState);
    await sleep(3000);
    console.log('end selector get');
    return `selector-${atom1}`;
  },
});

export default function Other() {
  return (
    <FiddichRoot>
      <Suspense fallback={<p>atom loading...</p>}>
        <AtomComponent></AtomComponent>
      </Suspense>
      <Suspense fallback={<p>selector loading...</p>}>
        <SelectorComponent></SelectorComponent>
      </Suspense>
    </FiddichRoot>
  );
}

const AtomComponent: FC = (props) => {
  try {
    const atomString = useFiddichValue(AtomState);

    return (
      <div style={{ backgroundColor: 'gray', padding: '10px' }}>
        <p>{atomString}</p>
      </div>
    );
  } catch (e) {
    console.log('atom throw');
    throw e;
  }
};

const SelectorComponent: FC = (props) => {
  try {
    const selectorString = useFiddichValue(SourceSelector);

    return (
      <div style={{ backgroundColor: 'gray', padding: '10px' }}>
        <p>{selectorString}</p>
      </div>
    );
  } catch (e) {
    console.log('selector throw');
    throw e;
  }
};