// import './App.css';

import { useEffect, useState } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import Home from "./component/Home";
import MeetingRoom from "./component/MeetingRoom";
// import { usePa}ß

function App() {
  const [isJoin, setIsJoin] = useState(false);
  const [channelID, setChannelID] = useState('');
  const { joinChannelID } = useParams();

  useEffect(() => {
    console.log(joinChannelID);
    if (joinChannelID) {
      setChannelID(joinChannelID)
      setIsJoin(true)
    }
  }, []);

  return (
    <div className="App">
      {isJoin ? <MeetingRoom channelID={channelID} setIsJoin={setIsJoin} /> : <Home setIsJoin={setIsJoin} channelID={channelID} setChannelID={setChannelID} />}
    </div>
  );
}

export default App;
