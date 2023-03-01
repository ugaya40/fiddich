import { useState } from "react";
import { Basic } from "./Basic";
import { SubRoot } from "./SubRoot";
import { MoveRoot } from "./MoveRoot";
import { ErrorState } from "./ErrorState";

import './index.css';

function App() {
  const [mode, setMode] = useState('Basic');
  return (
    <div>
      <div style={{display: 'flex'}}>
        <button onClick={() => setMode('Basic')}>Basic</button>
        <button onClick={() => setMode('SubRoot')}>SubRoot</button>
        <button onClick={() => setMode('MoveRoot')}>MoveRoot</button>
        <button onClick={() => setMode('ErrorState')}>ErrorState</button>
      </div>
      {mode === 'Basic' && <Basic/>}
      {mode === 'SubRoot' && <SubRoot/>}
      {mode === 'MoveRoot' && <MoveRoot/>}
      {mode === 'ErrorState' && <ErrorState/>}
    </div>
  );
}

export default App;
 