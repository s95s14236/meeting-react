import { combineReducers } from 'redux';
import channelIDReducer from './channelID';
import joinReducer from './isJoin';
import userReducer from './user';

const allReducers = combineReducers({
    isJoin: joinReducer,
    channelID: channelIDReducer,
    user: userReducer
});

export default allReducers;