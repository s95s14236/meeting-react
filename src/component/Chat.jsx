import { addDoc, collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { db } from "../firebase";
import ChatMessageBox from "./ChatMessageBox";

const Chat = () => {
    const channelID = useSelector(state => state.channelID);
    const user = useSelector(state => state.user);
    const [messageList, setMessageList] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        queryChatMessage();
    }, [])

    /**
     * 初始化訊息data
     */
    const queryChatMessage = () => {
        const callDocRef = doc(db, 'calls', channelID);
        console.log(callDocRef.path);
        const chatMessagesRef = collection(db, callDocRef.path, 'chatMessages');

        onSnapshot(query(chatMessagesRef, orderBy('createAt')), snapshot => {
            setMessageList(snapshot.docs.map(doc => doc));
        });
    }

    /**
     * 發送訊息
     */
    const sendMessage = () => {
        if (message.trim() === '') {
            return;
        }
        const callDocRef = doc(db, 'calls', channelID);
        const chatMessagesRef = collection(db, callDocRef.path, 'chatMessages');
        addDoc(chatMessagesRef, { createAt: new Date(), fromUser: user.id, message: message }).then(() => {
            setMessage('');
        });
    }

    /**
     * 監聽message input keydown enter
     */
    const onKeyDown = (event) => {
        console.log(event);
        if (event.key === "Enter") {
            sendMessage();
        }
    }

    return (
        <div className="w-full h-full sm:w-full sm:h-full bg-slate-50">
            <div className="w-full h-[90%] flex flex-col items-center overflow-y-scroll">
                {messageList.map((doc) => {
                    return <ChatMessageBox key={doc.id} fromUser={doc.data().fromUser} message={doc.data().message} />
                })}

            </div>

            <div className="sm:w-full sm:h-[10%] flex justify-center items-center">
                <input className="border-2 border-slate-400 w-3/4 h-9" onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => onKeyDown(e)} value={message} />
                <button className=" rotate-90 ml-4" onClick={sendMessage}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700 hover:text-slate-900 active:scale-95" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default Chat;