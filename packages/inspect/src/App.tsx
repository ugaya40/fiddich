import { useState } from "react";
import { Basic } from "./Basic";
import { SubRoot } from "./SubRoot";

import './index.css';
import { MoveRoot } from "./MoveRoot";
import { PromiseState } from "./PromiseState";
import Other from "./Other";

function App() {
  const [mode, setMode] = useState('Basic');
  return (
    <div>
      <div style={{display: 'flex'}}>
        <button onClick={() => setMode('Basic')}>Basic</button>
        <button onClick={() => setMode('SubRoot')}>SubRoot</button>
        <button onClick={() => setMode('MoveRoot')}>MoveRoot</button>
        <button onClick={() => setMode('PromiseState')}>PromiseState</button>
        <button onClick={() => setMode('Other')}>Other</button>
      </div>
      {mode === 'Basic' && <Basic/>}
      {mode === 'SubRoot' && <SubRoot/>}
      {mode === 'MoveRoot' && <MoveRoot/>}
      {mode === 'PromiseState' && <PromiseState/>}
      {mode === 'Other' && <Other/>}
    </div>
  );
}

export default App;
 