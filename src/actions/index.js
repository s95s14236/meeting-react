//#region joinReducer
export const join = () => {
    return {
        type: 'JOIN'
    }
};

export const leave = () => {
    return {
        type: 'LEAVE'
    }
};
//#endregion joinReducer

//#region channelIDReducer
export const setChannelID = (channelID) => {
    return {
        type: 'SET',
        payload: channelID
    }
}

export const unsetChannelID = () => {
    return {
        type: 'UNSET'
    }
}
//#endregion channelIDReducer