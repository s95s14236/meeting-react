import { User } from "../model/User";

const userReducer = (state = new User(), action) => {
    switch (action.type) {
        default:
            return state;
    }
}

export default userReducer;