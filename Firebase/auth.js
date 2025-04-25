const jwt = require('jsonwebtoken');
const {fetchData, writeData, updateData, deleteData ,fetchDataById} = require('./firebaseDB');
const { response } = require('express');
const axios = require('axios');

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
    async verifyOtp(path, phoneNumber,otp) {
        try {
            const users = await fetchData(path);
            const usersArray = Array.isArray(users) ?
                users.filter(Boolean) :
                Object.values(users || {}).filter(Boolean);
            if (usersArray.find((u) => u.phoneNumber === phoneNumber)) {
                const userDetails = usersArray.find((u) => u.phoneNumber === phoneNumber);
                if (userDetails.otp === otp) {
                    return { message: 'OTP verified successfully', response: true };
                } else {
                    return { message: 'Invalid OTP' };
                }
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw new Error('Failed to verify OTP');
        }
    }
    // get the user details by phone number
    async getUserByPhone(phoneNumber) {
        try {
            const users = await fetchData('users');
            const usersArray = Array.isArray(users) ?
                users.filter(Boolean) :
                Object.values(users || {}).filter(Boolean);
            const user = usersArray.find((u) => u.phoneNumber === phoneNumber);
            if (!user) {
                return { message: 'User not found' };
            }
            // update user otp
            const apiUrl = process.env.OTP_URL;
            if (!apiUrl) {
                return res.status(500).json({ error: 'API URL not configured' });
            }
            const fullApiUrl = `${apiUrl}?regno=${phoneNumber}`;
            const response = await axios.get(fullApiUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const otp = response.data;
            if (!otp) {
                return res.status(500).json({ error: 'Failed to generate OTP' });
            }
            user.otp = otp;
            await updateData('users', user, phoneNumber);
            return { message: 'User retrieved successfully', response:true };
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
    
    // update the user details
    async updateUser(path, phoneNumber, user) {
        try {
            const users = await fetchData(path);
            const usersArray = Array.isArray(users) ?
                users.filter(Boolean) :
                Object.values(users || {}).filter(Boolean);
            if (usersArray.find((u) => u.phoneNumber === phoneNumber)) {
                await updateData(path, user, phoneNumber);
                return { message: 'User updated successfully' };
            } else {
                return { message: 'User not found' };
            }
        } catch (error) {
            return { message: 'Failed to update user' };
        }
    }
}

// export the class
module.exports = {FirebaseAuth};