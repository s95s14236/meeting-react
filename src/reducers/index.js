import { combineReducers } from 'redux';
import joinReducer from './isJoin';

const allReducers = combineReducers({
    isJoin: joinReducer
});

export default allReducers;