import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { join } from '../actions';
import '../App.css'

const Home = (props) => {
    const { channelID, setChannelID } = props;
    const dispatch = useDispatch();
    const [errorInfo, setErrorInfo] = useState({isShowError: false, errorMessage: ''});

    const onCreateClick = () => {
        console.log('onCreateClick');
        dispatch(join());
    };

    const onJoinClick = () => {
        console.log('onJoinClick');
        if (channelID && channelID.trim() !== '') {
            setErrorInfo({isShowError: false, errorMessage: ''});
            dispatch(join());
        } else {
            setErrorInfo({isShowError: true, errorMessage: '加入失敗'});
        }
    };

    return (
        <div className="noselect w-screen sm:h-screen">
            <header className="w-screen h-[10vh] flex items-center pl-6 sm:pl-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div className="font-medium text-blue-600 text-2xl ml-2">Meeting</div>
            </header>

            <div className="w-full h-[90vh] flex flex-col sm:flex-row">
                <div className="w-full h-full flex items-center justify-center sm:w-[50%]">
                    <div className="flex flex-col items-center sm:items-start sm:text-left">
                        <div className="text-2xl sm:text-4xl font-bold mb-8">
                            馬上開始建立<br />
                            你的專屬視訊會議
                        </div>
                        <div className="w-full flex flex-col sm:flex-row items-center sm:items-center">
                            <button
                                className="w-36 h-12 mb-2 bg-gray-800 text-slate-100 text-lg font-medium rounded-md hover:bg-gray-900 sm:mr-4 sm:mb-0"
                                onClick={onCreateClick}>發起會議</button>
                            或
                            <input
                                className="pl-2 h-12 mt-2 rounded-md border-2 border-gray-500 sm:ml-4 sm:mt-0" placeholder="輸入會議代碼"
                                onChange={(e) => setChannelID(e.target.value)}
                            />
                            {errorInfo.isShowError && <p className='pl-1 text-red-700'>{errorInfo.errorMessage}</p>}
                            <button
                                className="h-12 w-20 mt-2 hover:bg-blue-100 rounded-md sm:ml-2 sm:mt-0 text-blue-800"
                                onClick={onJoinClick}
                            >加入會議</button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center mb-20 sm:mb-0">
                    <img className=" shadow-inner sm:w-[80vh] sm:h-[62vh]" src={require('../asset/meeting.jpg')} alt="meeting" />
                </div>
            </div>
        </div>
    )
}

export default Home;