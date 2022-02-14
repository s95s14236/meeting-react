// import './App.css';

import MeetingRoom from "./component/MeetingRoom";

function App() {
  return (
    <div className="App">
      {/* <video className="w-64 h-48 bg-slate-500 rounded" ref={localVideo} autoPlay></video>
      <video className="w-64 h-48 m-8 bg-slate-500 rounded" ref={remoteVideo} autoPlay></video>
      <button onClick={startWebcam}>開啟視訊</button>
      <button onClick={createCall}>發起通話</button>
      <input value={callID} onChange={(e) => setCallID(e.target.value)}></input>
      <button onClick={joinCall}>加入通話</button> */}
      
      <MeetingRoom />
    </div>
  );
}

export default App;
