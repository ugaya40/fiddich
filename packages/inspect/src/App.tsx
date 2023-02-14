import { useState } from "react";
import { Basic } from "./Basic";
import { Family } from "./Family";
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
      </div>
      {mode === 'Basic' && <Basic/>}
      {mode === 'Family' && <Family/>}
      {mode === 'SubRoot' && <SubRoot/>}
      {mode === 'PromiseState' && <PromiseState/>}
    </div>
  );
}

export default App;
 