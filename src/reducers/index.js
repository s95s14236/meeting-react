import { combineReducers } from 'redux';
import channelIDReducer from './channelID';
import joinReducer from './isJoin';

const allReducers = combineReducers({
    isJoin: joinReducer,
    channelID: channelIDReducer
});

export default allReducers;