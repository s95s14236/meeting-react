import { useRef, useState } from 'react';

// import { db } from './firebase';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDoc, doc, addDoc, onSnapshot, updateDoc, query, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyC3oqkUEn7KF9wDV2-pPYR0w_-ovrnxPTs",
    authDomain: "meeting-6a4a2.firebaseapp.com",
    projectId: "meeting-6a4a2",
    storageBucket: "meeting-6a4a2.appspot.com",
    messagingSenderId: "654889178463",
    appId: "1:654889178463:web:9f9de90607b4498fc3d2ea"
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

const MeetingRoom = () => {
    const localVideo = useRef();
    const remoteVideo = useRef();
    const [callID, setCallID] = useState('');

    async function startWebcam() {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // localStream = await navigator.mediaDevices.getDisplayMedia();
        remoteStream = new MediaStream();

        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        })

        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
        };

        localVideo.current.srcObject = localStream
        remoteVideo.current.srcObject = remoteStream;
    }

    async function createCall() {
        const docRef = doc(collection(db, "calls"));
        const offerCandidatesRef = collection(db, docRef.path, 'offerCandidates');
        const answerCandidatesRef = collection(db, docRef.path, 'answerCandidates');

        setCallID(docRef.id);

        pc.onicecandidate = event => {
            console.log('onicecandidate', event);
            event.candidate && addDoc(offerCandidatesRef, event.candidate.toJSON());
        }

        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        }

        setDoc(docRef, offer);

        onSnapshot(docRef, (snapshot) => {
            console.log('callDoc snapshot', snapshot);
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.setRemoteDescription(answerDescription);
            }
        });

        onSnapshot(answerCandidatesRef, (snapshot) => {
            console.log('answerCandidates snapshot', snapshot);
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            })
        })
    }

    async function joinCall() {
        const docRef = doc(db, 'calls', callID)
        const callDoc = (await getDoc(docRef));
        const offerCandidatesRef = collection(db, docRef.path, 'offerCandidates');
        const answerCandidatesRef = collection(db, docRef.path, 'answerCandidates');

        pc.onicecandidate = event => {
            event.candidate && addDoc(answerCandidatesRef, event.candidate.toJSON());
        }

        const offerDesription = callDoc.data();
        await pc.setRemoteDescription(new RTCSessionDescription(offerDesription));

        const answerDescription = await pc.createAnswer();
        await pc.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp
        };

        await updateDoc(docRef, { answer });

        onSnapshot(query(offerCandidatesRef), (snapshot) => {
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
            <video className="w-64 h-48 bg-slate-500 rounded" ref={localVideo} autoPlay></video>
            <video className="w-64 h-48 m-8 bg-slate-500 rounded" ref={remoteVideo} autoPlay></video>
            <button onClick={startWebcam}>開啟視訊</button>
            <button onClick={createCall}>發起通話</button>
            <input value={callID} onChange={(e) => setCallID(e.target.value)}></input>
            <button onClick={joinCall}>加入通話</button>
        </div>
    );
}

export default MeetingRoom;