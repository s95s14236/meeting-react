import { useEffect, useRef, useState } from 'react';

import { db } from '../firebase';

import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, query, setDoc } from 'firebase/firestore';

const server = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ],
    iceCandidatePoolSize: 10
};

let pc = null;
let localStream = null;
let remoteStream = null;

const MeetingRoom = (props) => {
    const { channelID, setIsJoin } = props;
    const localVideo = useRef();
    const remoteVideo = useRef();
    const [callID, setCallID] = useState('');
    const [isEnableCamera, setIsEnableCamera] = useState(false);
    const [isEnableMicrophone, setIsEnableMicrophone] = useState(false);
    const [isShowInfo, setIsShowInfo] = useState(false);

    useEffect(() => {
        pc = new RTCPeerConnection(server);
        startWebcam().then(() => {
            checkCameraAndMicrophone();
            if (channelID !== '') {
                setCallID(channelID);
                joinCall();
            } else {
                createCall();
            }
        }).catch(error => {
            console.error(error);
        });
    }, []);

    /**
     * 初始化鏡頭&麥克風
     */
    const startWebcam = async () => {
        console.log('startWebcam');
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

    /**
     * 創建通話
     */
    const createCall = async () => {
        console.log('createCall');
        const docRef = doc(collection(db, "calls"));
        const offerCandidatesRef = collection(db, docRef.path, 'offerCandidates');
        const answerCandidatesRef = collection(db, docRef.path, 'answerCandidates');

        setCallID(docRef.id);
        console.log('callID', docRef.id);

        pc.onicecandidate = event => {
            console.log('onicecandidate', event);
            event.candidate && addDoc(offerCandidatesRef, event.candidate.toJSON());
        }

        subscribePCEvent();

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

    /**
     * 加入通話
     */
    const joinCall = async () => {
        console.log('joinCall');
        const docRef = doc(db, 'calls', channelID)
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

    };

    /**
     * 結束通話
     */
    const hangup = () => {
        console.log('hangup');
        if (!pc) return;

        localStream.getAudioTracks()[0].stop();
        localStream.getVideoTracks()[0].stop();

        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onnegotiationneeded = null;
        unSubscribePCEvent();

        pc.getSenders().forEach((sender) => {
            pc.removeTrack(sender);
        });

        if (localVideo.current.srcObject) {
            localVideo.current.pause();
            localVideo.current.srcObject.getTracks().forEach((track) => {
                track.stop();
            })
        }

        pc.close();
        pc = null;

        setIsJoin(false);
    };

    const toggleInfo = () => {
        setIsShowInfo((prev) => !prev)
    };

    const toggleCamera = () => {
        localStream.getVideoTracks()[0].enabled = !(localStream.getVideoTracks()[0].enabled);
        setIsEnableCamera(localStream.getVideoTracks()[0].enabled);
    }

    const toggleMicrophone = () => {
        localStream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled);
        setIsEnableMicrophone(localStream.getAudioTracks()[0].enabled);
    }

    const checkCameraAndMicrophone = () => {
        console.log('456');
        setIsEnableMicrophone(localStream.getAudioTracks()[0].enabled);
        setIsEnableCamera(localStream.getVideoTracks()[0].enabled);
    }

    const subscribePCEvent = () => {
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected') {
                console.log('remote Disconnected');
                remoteVideo.current.srcObject = null;
            }
        }
    }

    const unSubscribePCEvent = () => {
        pc.oniceconnectionstatechange = null;
    }

    return (
        <div className="relative">
            <video className="absolute left-4 top-4 w-24 sm:w-48 h-36 sm:h-36 rounded-md bg-black" ref={localVideo} autoPlay muted></video>
            <video className="w-screen h-screen bg-black" ref={remoteVideo} autoPlay></video>
            <div className='absolute bottom-8 left-1/2 right-1/2 translate-x-[-50%] translate-y-[-50%] w-80 flex flex-row items-center justify-around'>
                <button className="flex justify-center items-center w-20 h-20 rounded-full bg-red-600 hover:bg-red-700" onClick={hangup}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
                    </svg>
                </button>
                <button
                    onClick={toggleMicrophone}
                    className={(isEnableMicrophone ? "bg-gray-500 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700") + " flex justify-center items-center w-20 h-20 rounded-full"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                </button>
                <button
                    onClick={toggleCamera}
                    className={(isEnableCamera ? "bg-gray-500 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700") + " flex justify-center items-center w-20 h-20 rounded-full"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                </button>
            </div>
            <div className='absolute bottom-24 right-8'>
                <button
                    onClick={toggleInfo}
                    className={(isShowInfo ? "bg-gray-300 hover:bg-gray-400" : "bg-gray-500 hover:bg-gray-600") + " flex justify-center items-center w-8 h-8 rounded-full"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>
            {isShowInfo && callID && <div className='w-80 h-40 p-4 absolute bottom-36 right-4 bg-white rounded-md'>
                會議代碼：{callID}
            </div>}

            {/* <button onClick={startWebcam}>開啟視訊</button>
            <button onClick={createCall}>發起通話</button>
            <input value={callID} onChange={(e) => setCallID(e.target.value)}></input>
            <button onClick={joinCall}>加入通話</button> */}
        </div>
    );
}

export default MeetingRoom;