// import './App.css';

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { join } from "./actions";
import Home from "./component/Home";
import MeetingRoom from "./component/MeetingRoom";

function App() {
  // const [isJoin, setIsJoin] = useState(false);
  const [channelID, setChannelID] = useState('');
  const { joinChannelID } = useParams();
  const isJoin = useSelector(state => state.isJoin);
  const dispatch = useDispatch();

  useEffect(() => {
    if (joinChannelID) {
      setChannelID(joinChannelID)
      dispatch(join());
    }
  }, []);

  return (
    <div className="App">
      {isJoin ? <MeetingRoom channelID={channelID} /> : <Home channelID={channelID} setChannelID={setChannelID} />}
    </div>
  );
}

export default App;
