// import './App.css';

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { join, setChannelID } from "./actions";
import Home from "./component/Home";
import MeetingRoom from "./component/MeetingRoom";

function App() {
  const { joinChannelID } = useParams();
  const isJoin = useSelector(state => state.isJoin);
  const dispatch = useDispatch();

  useEffect(() => {
    if (joinChannelID) {
      dispatch(setChannelID(joinChannelID))
      dispatch(join());
    }
  }, []);

  return (
    <div className="App">
      {isJoin ? <MeetingRoom /> : <Home />}
    </div>
  );
}

export default App;
