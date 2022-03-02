const joinReducer = (state = false, action) => {
    switch (action.type) {
        case 'JOIN':
            return true;
        case 'LEAVE':
            return false;
        default:
            return state;
    }
}

export default joinReducer;