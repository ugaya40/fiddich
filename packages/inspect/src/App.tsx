import { useState } from "react";
import { Basic } from "./Basic";
import { Family } from "./Family";
import Other from "./Other";
import { PromiseState } from "./PromiseState";
import { SubRoot } from "./SubRoot";

function App() {
  const [mode, setMode] = useState('Basic');
  return (
    <div>
      <div style={{display: 'flex'}}>
        <button onClick={() => setMode('Basic')}>Basic</button>
        <button onClick={() => setMode('Family')}>Family</button>
        <button onClick={() => setMode('SubRoot')}>SubRoot</button>
        <button onClick={() => setMode('PromiseState')}>PromiseState</button>
        <button onClick={() => setMode('Other')}>Other</button>
      </div>
      {mode === 'Basic' && <Basic/>}
      {mode === 'Family' && <Family/>}
      {mode === 'SubRoot' && <SubRoot/>}
      {mode === 'PromiseState' && <PromiseState/>}
      {mode === 'Other' && <Other/>}
    </div>
  );
}

export default App;
 