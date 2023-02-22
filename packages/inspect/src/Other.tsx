import { atom, FiddichRoot, selector, useValue } from "fiddich";
import { FC, Suspense } from "react";
import { sleep } from "./share";

const AtomState = atom({
  key: 'AtomState',
  default: new Promise<string>((r) => {
    console.log('start atom get');
    setTimeout(() => {
      console.log('end atom get');
      r('ok');
    }, 3000);
  }),
});

const SourceSelector = selector({
  key: 'SourceSelector',
  getAsync: async ({ get }) => {
    console.log('start selector get');
    const atom1 = await get(AtomState);
    await sleep(3000);
    console.log('end selector get');
    return `selector-${atom1}`;
  },
});

export default function Other() {
  return (
    <FiddichRoot>
      <Suspense fallback={<p>atom loading...</p>}>
        <AtomComponent/>
      </Suspense>
      <Suspense fallback={<p>selector loading...</p>}>
        <SelectorComponent/>
      </Suspense>
    </FiddichRoot>
  );
}

const AtomComponent: FC = (props) => {
  try {
    const atomString = useValue(AtomState);

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
    const selectorString = useValue(SourceSelector);

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