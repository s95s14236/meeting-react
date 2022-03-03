import { useEffect, useRef, useState } from 'react';

import { db } from '../firebase';

import { collection, getDoc, doc, addDoc, onSnapshot, updateDoc, query, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import Chat from './Chat';
import { useDispatch } from 'react-redux';
import { leave, setChannelID, unsetChannelID } from '../actions';
import { useSelector } from 'react-redux';

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
let localScreenStream = null;
let remoteStream = null;

const MeetingRoom = () => {
    const dispatch = useDispatch();
    const channelID = useSelector(state => state.channelID);
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const localVideo = useRef();
    const remoteVideo = useRef();
    const shareScreenBtn = useRef();
    const [isEnableCamera, setIsEnableCamera] = useState(false);
    const [isEnableMicrophone, setIsEnableMicrophone] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isShowInfo, setIsShowInfo] = useState(false);
    const [isShowChat, setIsShowChat] = useState(false);
    const [popupInfo, setPopupInfo] = useState({ isShowPopup: false, popupMessage: '' });
    const [isCaller, setIsCaller] = useState(false);
    const isCallerRef = useRef();
    const channelIDRef = useRef();
     
    isCallerRef.current = isCaller;
    channelIDRef.current = channelID;


    useEffect(() => {
        console.log('MeetingRoom init');
        window.onresize = () => {
            setScreenWidth(window.innerWidth);
        }
        pc = new RTCPeerConnection(server);
        registerPeerConnectionListeners();
        startWebcamTrack().then(() => {
            checkCameraAndMicrophone();
            subscribeRemoteTrack();
            if (channelID !== '') {
                dispatch(setChannelID(channelID));
                joinCall();
            } else {
                setIsCaller(true);
                createCall().then(() => {
                    setIsShowInfo(true);
                });
            }
        }).catch(error => {
            console.error(error);
        });

        return () => {
            console.log('MeetingRoom deinit');
            window.onresize = null;
            hangup();
            dispatch(unsetChannelID());
        }
    }, []);

    /**
     * 初始化鏡頭&麥克風
     */
    const startWebcamTrack = async () => {
        console.log('startWebcam');
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        })

        localVideo.current.srcObject = localStream;
    }

    /**
     * 訂閱遠端Track
     */
    const subscribeRemoteTrack = () => {
        console.log('subscribeRemoteTrack');
        remoteStream = new MediaStream();
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
        };
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

        dispatch(setChannelID(docRef.id));

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

        await setDoc(docRef, offer);

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
        if (!offerDesription) {
            setPopupInfo({ isShowPopup: true, popupMessage: '找不到房間' });
            setTimeout(() => {
                hangup();
            }, 3000);
            return;
        }
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
    const hangup = async () => {
        console.log('hangup');
        if (!pc) return;

        localStream && localStream.getAudioTracks()[0].stop();
        localStream && localStream.getVideoTracks()[0].stop();
        localScreenStream && localScreenStream.getVideoTracks()[0].stop();

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

        if (isCallerRef.current) {
            console.log('I am caller');
            const offerCandidatesRef = collection(db, "calls", channelIDRef.current, 'offerCandidates');
            (await getDocs(offerCandidatesRef)).docs.forEach((doc) => {
                deleteDoc(doc.ref);
            })
        } else {
            console.log('I am callee');
            const answerCandidatesRef = collection(db, "calls", channelIDRef.current, 'answerCandidates');
            (await getDocs(answerCandidatesRef)).docs.forEach((doc) => {
                deleteDoc(doc.ref);
            })
        }

        dispatch(leave());
    };

    /**
     * toggle 顯示會議資訊
     */
    const toggleInfo = () => {
        setIsShowInfo((prev) => !prev);
        setIsShowChat(false);
    };

    /**
     * toggle 顯示聊天室
     */
    const toggleChat = () => {
        setIsShowChat(prev => !prev);
        setIsShowInfo(false);
    }

    /**
     * toggle 相機
     */
    const toggleCamera = () => {
        localStream.getVideoTracks()[0].enabled = !(localStream.getVideoTracks()[0].enabled);
        setIsEnableCamera(localStream.getVideoTracks()[0].enabled);
    }

    /**
     * toggle 麥克風
     */
    const toggleMicrophone = () => {
        localStream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled);
        setIsEnableMicrophone(localStream.getAudioTracks()[0].enabled);
    }

    /**
     * 當按下螢幕分享畫面
     */
    const toggleShareScreen = async () => {
        if (isScreenSharing) {
            setPopupInfo({isShowPopup: true, popupMessage: `請透過'停止共用'結束分享`});
            setTimeout(() => {
                setPopupInfo({isShowPopup: false, popupMessage: ``});
            }, 3000);
        } else {
            await setScreenTrack().catch(error => {
                console.error('setScreenTrack FAIL, error: ', error);
                return;
            });
            setIsScreenSharing(!isScreenSharing);
        }
    }

    /**
     * 切換至螢幕分享畫面
     */
    const setScreenTrack = async () => {
        console.log("startScreenTrack");
        const config = {
            video: {
                cursor: "always"
            }
        }
        localScreenStream = await navigator.mediaDevices.getDisplayMedia(config).catch(error => {
            console.error('getDisplayMedia FAIL, error: ', error);
            return;
        });
        localScreenStream.getVideoTracks()[0].onended = () => {
            console.log('track-ended');
            setVideoTrack();
            setIsScreenSharing(false);
        }

        pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === 'video') {
                sender.replaceTrack(localScreenStream.getVideoTracks()[0]);
            }
        })
        localVideo.current.srcObject = localScreenStream;
    }

    /**
     * 切換至我的視訊畫面
     */
    const setVideoTrack = () => {
        console.log("setVideoTrack");

        pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === 'video') {
                sender.replaceTrack(localStream.getVideoTracks()[0]);
            }
        })
        localVideo.current.srcObject = localStream;
    }

    /**
     * 更新目前視訊／音訊按鈕狀態
     */
    const checkCameraAndMicrophone = () => {
        setIsEnableMicrophone(localStream.getAudioTracks()[0].enabled);
        setIsEnableCamera(localStream.getVideoTracks()[0].enabled);
    }

    /**
     * 註冊rtc連線事件
     */
    const registerPeerConnectionListeners = () => {
        pc.oniceconnectionstatechange = () => {
            console.log(pc.iceConnectionState);
            switch (pc.iceConnectionState) {
                case 'connected':
                    console.log('remote connected');

                    break;
                case 'disconnected':
                    console.log('remote Disconnected');
                    // remoteVideo.current.srcObject = null;
                    setPopupInfo({ isShowPopup: true, popupMessage: '對方已結束通話' });
                    setTimeout(() => {
                        hangup();
                    }, 3000)
                    break;

                default:
                    break;
            }

        }
    }

    /**
     * 複製會議url
     */
    const copyUrl = () => {
        console.log(`${window.location.href}${channelID}`);
        navigator.clipboard.writeText(`${window.location.href}${channelID}`);
    }

    /**
     * 解除rtc連線事件訂閱
     */
    const unSubscribePCEvent = () => {
        pc.oniceconnectionstatechange = null;
    }

    return (
        <div className="flex flex-row">
            <div className='relative w-[100vw] h-[100vh] sm:w-[100vw] '>
                <video className="absolute left-4 top-4 w-24 sm:w-48 h-36 sm:h-36 rounded-md bg-black" ref={localVideo} autoPlay muted playsInline ></video>
                <video className="w-full h-full bg-black" ref={remoteVideo} autoPlay playsInline></video>
                <div className='absolute bottom-8 left-1/2 right-1/2 translate-x-[-50%] translate-y-[-50%] w-80 sm:w-96 flex flex-row items-center justify-around'>
                    <button className="flex justify-center items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-700" onClick={hangup} >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:h-10 sm:w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                            <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={toggleMicrophone}
                        className={(isEnableMicrophone ? "bg-gray-500 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700") + " flex justify-center items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:h-10 sm:w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button
                        onClick={toggleCamera}
                        className={(isEnableCamera ? "bg-gray-500 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700") + " flex justify-center items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:h-10 sm:w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                    </button>
                    {screenWidth > 768 && <button
                        ref={shareScreenBtn}
                        onClick={toggleShareScreen}
                        className={(isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600") + " flex justify-center items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:h-10 sm:w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </button>}
                </div>
                <div className='absolute bottom-[85vh] right-8 sm:bottom-24 sm:right-8 flex flex-row'>
                    <button
                        onClick={toggleInfo}
                        className={(isShowInfo ? "bg-gray-300 hover:bg-gray-400" : "bg-gray-500 hover:bg-gray-600") + " flex justify-center items-center w-8 h-8 rounded-full"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={toggleChat}
                        className={(isShowChat ? "bg-gray-300 hover:bg-gray-400" : "bg-gray-500 hover:bg-gray-600") + " flex justify-center items-center w-8 h-8 rounded-full ml-2"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                {isShowInfo
                    && channelID !== ''
                    && <div className='w-[95vw] h-40 sm:max-w-lg sm:h-40 p-4 absolute bottom-[40vh] left-1/2 right-1/2 translate-x-[-50%] translate-y-[-50%]
                sm:bottom-40 sm:left-auto sm:right-12 sm:translate-x-0 sm:translate-y-0 bg-white rounded-md shadow-md'>
                        會議代碼：<br />{channelID}<br /><br />
                        會議連結：<br />
                        <div className='flex items-center justify-center w-full'>
                            <div className=' max-w[85%] text-ellipsis overflow-hidden'>{window.location.href + channelID}</div>
                            <button onClick={copyUrl} className="ml-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>}

                {
                    popupInfo.isShowPopup && <div className='w-80 h-40 p-4 absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] bg-white rounded-md text-red-800 flex justify-center items-center shadow-md'>
                        {popupInfo.popupMessage}
                    </div>
                }

                {
                    isShowChat && <div className='absolute top-[16.5vh] left-1/2 right-1/2 translate-x-[-50%] sm:top-auto sm:left-auto sm:right-4 sm:bottom-40 sm:translate-x-0 w-[95%] h-[70vh] sm:w-[25vw] sm:h-[70vh] py-4 bg-slate-100 rounded-md shadow-md'>
                        {channelID !== '' && <Chat isCaller={isCaller} />}
                    </div>
                }
            </div>

        </div>
    );
}

export default MeetingRoom;