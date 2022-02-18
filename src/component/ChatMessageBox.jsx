
const ChatMessageBox = (props) => {
    const { isMyMessage, message } = props;

    return (
        <div className={"w-[90%] mb-2 flex " + (isMyMessage ? " justify-end" : " ")}>
            <div className={"max-w-full border-[1px] w-fit p-2 rounded-md text-left text-ellipsis overflow-hidden " + (isMyMessage ? " bg-blue-100 rounded-br-none" : "bg-gray-100 rounded-bl-none")}>
                {message}
            </div>
        </div>
    )
}

export default ChatMessageBox;