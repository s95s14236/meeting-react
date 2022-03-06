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