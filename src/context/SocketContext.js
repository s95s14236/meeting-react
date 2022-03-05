import { createContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
    const ENDPOINT = process.env.REACT_APP_SOCKET_HOST;
    const socket = io(ENDPOINT);
    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export { SocketContext, SocketProvider };
