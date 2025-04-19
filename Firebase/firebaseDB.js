require('dotenv').config();
const baseUrl = process.env.FIREBASE_DATABSE_URL;
// 1. READ data using fetch
async function fetchData(path) {
  try {
    const response = await fetch(`${baseUrl}/${path}.json`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// 2. WRITE data
async function writeData(path, data,id) {
  try {
    const response = await fetch(`${baseUrl}/${path}/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error writing data:", error);
    throw error;
  }
}

// 3. UPDATE data (patch)
async function updateData(path, updates,id) {
  try {
    const response = await fetch(`${baseUrl}/${path}/${id}.json`, {
      method: 'PATCH', 
      body: JSON.stringify(updates),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error updating data:", error);
    throw error;
  }
}

// 4. DELETE data
async function deleteData(path,id) {
  try {
    const response = await fetch(`${baseUrl}/${path}/${id}.json`, {
      method: 'DELETE'
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  }
}

// 5. Read data by id
async function fetchDataById(path,id) {
  try {
    const response = await fetch(`${baseUrl}/${path}/${id}.json`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// fetchData('students').then(data => console.log(data));
module.exports = { fetchData, writeData, updateData, deleteData,fetchDataById };