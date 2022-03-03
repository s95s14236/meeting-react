const channelIDReducer = (state = '', action) => {
    switch (action.type) {
        case 'SET':
            return action.payload;
        case 'UNSET':
            return '';
        default:
            return state;
    }
}

export default channelIDReducer;