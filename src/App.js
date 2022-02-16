// import './App.css';

import { useState } from "react";
import Home from "./component/Home";
import MeetingRoom from "./component/MeetingRoom";

function App() {
  const [isJoin, setIsJoin] = useState(false);
  const [channelID, setChannelID] = useState('');

  return (
    <div className="App">
      {isJoin ? <MeetingRoom channelID={channelID} setIsJoin={setIsJoin} /> : <Home setIsJoin={setIsJoin} setChannelID={setChannelID} />}
    </div>
  );
}

export default App;
