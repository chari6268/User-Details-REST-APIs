const jwt = require('jsonwebtoken');
const {fetchData, writeData, updateData, deleteData ,fetchDataById} = require('./firebaseDB');

class FirebaseAuth {
    async createUserWithPhone(path, user) {
        try {
            const users = await fetchData(path);
            const usersArray = Array.isArray(users) ?
                users.filter(Boolean) :
                Object.values(users || {}).filter(Boolean);
            if (usersArray.find((u) => u.phoneNumber === user.phoneNumber)) {
                return { message: 'User already exists' };
            }
            await writeData(path, user, user.phoneNumber);
            return user;
        } catch (error) {
            return { message: 'Failed to create user' };
        }
    }
    // verify the otp and return the user details
    async verifyOtp(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId;
            const user = await fetchDataById('users', userId);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw new Error('Failed to verify OTP');
        }
    }
    // get the user details by phone number
    async getUserByPhone(phoneNumber) {
        try {
            const users = await fetchData('users');
            const user = Object.values(users).find(user => user.phoneNumber === phoneNumber);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw new Error('Failed to fetch user');
        }
    }
    // generate otp with 6 digits
    async generateOtp() {
        const otp = Math.floor(100000 + Math.random() * 900000);
        return otp;
    }
}

// export the class
module.exports = {FirebaseAuth};