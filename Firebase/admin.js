const {fetchData, writeData, updateData, deleteData ,fetchDataById} = require('./firebaseDB');

class AdminAuth {
    // get all users details
    async getAllUsers(path) {
        try {
            const users = await fetchData(path);
            const usersArray = Array.isArray(users) ?
                users.filter(Boolean) :
                Object.values(users || {}).filter(Boolean);
            return usersArray;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new Error('Failed to fetch users');
        }
    }
}

// export the class
module.exports = {AdminAuth};