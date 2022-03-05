import { useSelector } from "react-redux";

const ChatMessageBox = (props) => {
    const user = useSelector(state => state.user);
    const { fromUser, message } = props;

    return (
        <div className={"w-[90%] mb-2 flex " + (fromUser === user.id? " justify-end" : " ")}>
            <div className={"max-w-full border-[1px] w-fit p-2 rounded-md text-left text-ellipsis overflow-hidden " + (fromUser === user.id ? " bg-blue-100 rounded-br-none" : "bg-gray-100 rounded-bl-none")}>
                {message}
            </div>
        </div>
    )
}

export default ChatMessageBox;