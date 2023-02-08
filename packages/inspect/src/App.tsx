import { useState } from "react";
import { Basic } from "./Basic";
import { SubRoot } from "./SubRoot";

function App() {
  const [mode, setMode] = useState('Basic');
  return (
    <div>
      <div style={{display: 'flex'}}>
        <button onClick={() => setMode('Basic')}>Basic</button>
        <button onClick={() => setMode('SubRoot')}>SubRoot</button>
      </div>
      {mode === 'Basic' && <Basic/>}
      {mode === 'SubRoot' && <SubRoot/>}
    </div>
  );
}

export default App;
 