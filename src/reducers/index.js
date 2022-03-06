import { combineReducers } from 'redux';
import channelIDReducer from './channelID';
import userReducer from './user';

const allReducers = combineReducers({
    channelID: channelIDReducer,
    user: userReducer
});

export default allReducers;