import { useRef, useState } from 'react';
import './App.css';
import { Video } from './component/Video';

// import { db } from './firebase';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3oqkUEn7KF9wDV2-pPYR0w_-ovrnxPTs",
  authDomain: "meeting-6a4a2.firebaseapp.com",
  projectId: "meeting-6a4a2",
  storageBucket: "meeting-6a4a2.appspot.com",
  messagingSenderId: "654889178463",
  appId: "1:654889178463:web:9f9de90607b4498fc3d2ea"
}

const app = initializeApp(firebaseConfig);
const db = getFirestore();

const server = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }
  ],
  iceCandidatePoolSize: 10
};

const pc = new RTCPeerConnection(server);
let localStream = null;
let remoteStream = null;

function App() {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const [callID, setCallID] = useState('');

  async function startWebcam() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    })

    pc.ontrack = (event) => {
      event.streams(0).getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    localVideo.current.srcObject = localStream
    remoteVideo.current.srcObject = remoteStream;
  }

  async function createCall() {
    // const callDoc = await setDoc(doc(db, 'calls'));
    const callRef = doc(collection(db, "calls"));
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    }
    await setDoc(callRef, offer);
    // const offerCandidates = collection(db, 'calls', 'offerCandidatesRef');
    // const answerCandidates = collection(db, 'calls', 'answerCandidates');

    // console.log(callDoc);

    // setCallID(callDoc.id);

    // pc.onicecandidate = event => {
    //   event.candidate && offerCandidates.add(event.candidate.toJSON());
    // }


    // callDoc.onSnapshot((snapshot) => {
    //   const data = snapshot.data();
    //   if (!pc.currentRemoteDescription && data?.answer) {
    //     const answerDescription = new RTCSessionDescription(data.answer);
    //     pc.setRemoteDescription(answerDescription);
    //   }
    // });

    // answerCandidates.onSnapshot((snapshot) => {
    //   snapshot.docChanges().forEach((change) => {
    //     if (change.type === 'added') {
    //       const candidate = new RTCIceCandidate(change.doc.date());
    //       pc.addIceCandidate(candidate);
    //     }
    //   })
    // })
  }

  async function joinCall() {
    const callDoc = await getDoc(doc(db, 'calls'));
    const offerCandidates = collection(db, 'offerCandidates');
    const answerCandidates = collection(db, 'answerCandidates');

    pc.onicecandidate = event => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    }

    const callData = (await callDoc.get()).data();

    const offerDesription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDesription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        console.log(change);
        if (change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      })
    })
  }

  return (
    <div className="App">
      <video className="w-48 m-48 bg-slate-500" ref={localVideo} autoPlay playsInline></video>
      <video className="w-48 m-48 bg-slate-500" ref={remoteVideo} autoPlay playsInline></video>
      <button onClick={startWebcam}>開啟視訊</button>
      <button onClick={createCall}>發起通話</button>
      <input value={callID} onChange={(e) => setCallID(e.target.value)}></input>
      <button onClick={joinCall}>加入通話</button>
    </div>
  );
}



export default App;
