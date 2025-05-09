const express = require('express');
const compression = require('compression');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const axios = require('axios');
require('dotenv').config();
const { FirebaseAuth } = require('./Firebase/auth');
const firebaseAuth = new FirebaseAuth();
const {AdminAuth} = require('./Firebase/admin');
const adminAuth = new AdminAuth();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT;

// Middleware
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get('/', (req, res) => {
    const filePath = __dirname + '/src/index.html';
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'index.html not found' });
    }
    res.sendFile(filePath);
  });
  
  // Sample REST endpoints
  app.get('/admin', (req, res) => {
    res.json({ message: 'Welcome to Screenova!'});
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });
  app.post('/create-user', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const otp = await firebaseAuth.generateOtp();
        if (!otp) {
            return res.status(500).json({ error: 'Failed to generate OTP' });
        }
        const user = { phoneNumber , token: uuidv4() , otp: otp };
        const userResponse = await firebaseAuth.createUserWithPhone('users', user);
        if (userResponse.message) {
          return res.status(400).json({ error: userResponse.message });
        }
        res.json({ message: 'User registered successfully', userResponse });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user!' });
    }
  });

  app.get('/get-user', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const user = await firebaseAuth.getUserByPhone(phoneNumber);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user!' });
    }
  });

  app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
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
        const user = { phoneNumber , token: uuidv4() , otp: otp };
        const userResponse = await firebaseAuth.createUserWithPhone('users', user);
        if (userResponse.message) {
          return res.status(400).json({ error: userResponse.message });
        }
        res.json({ message: 'OTP sent successfully', response:true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send OTP!' });
    }
  });

  app.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp} = req.body;
        if (!phoneNumber || !otp) {
            return res.status(400).json({ error: 'Phone number and OTP are required' });
        }
        const user = await firebaseAuth.verifyOtp('users',phoneNumber, otp);
        if (!user) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }
        res.json({user});
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify OTP!' });
    }
  });
  app.post('/loginUser', async (req, res) => {
    try {
        const { phoneNumber,token} = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const user = await firebaseAuth.getUserByPhone(phoneNumber);
        if (user.token !== token) {
            const oldToken = user.token;
            user.token = token;
            await firebaseAuth.createUserWithPhone('users', user);
            console.log(`Token updated for user ${phoneNumber}. Old token: ${oldToken}, New token: ${token}`);
        }else {
            console.log(`Token is same for user ${phoneNumber}. Token: ${token}`);
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User logged in successfully', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to login user!' });
    }
  });

  app.get('/student-details', async (req, res) => {
    try {
        const { regno } = req.body;
        if (!regno) {
            return res.status(400).json({ error: 'Registration number is required' });
        }
        // get the data from the .env file
        const apiUrl = process.env.PERSONAL_DETAILS;
        if (!apiUrl) {
            return res.status(500).json({ error: 'API URL not configured' });
        }
        const fullApiUrl = `${apiUrl}?regno=${regno}`;
        const response = await axios.get(fullApiUrl, {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          }
      });
        if (response.status !== 200) {
            return res.status(response.status).json({ error: 'Failed to fetch data from external API' });
        }
        res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  });

  app.get('/allUsers', async (req, res) => {
    try {
        const userStats = await adminAuth.getAllUsers('Users');
        res.json(userStats);
    } catch (error) {
        console.error('Error in allUsers:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  app.get('/allPosts/:username/:type', async (req, res) => {
    const { username, type } = req.params;
    try {
      const userStats = await adminAuth.getAllUsers(`Reports/${username}/${type}`);
      res.json(userStats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  // WebSocket handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Assign a unique ID to this connection
    const clientId = uuidv4();
    ws.id = clientId;
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to server',
      clientId
    }));
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received message from ${clientId}:`, data);
        
        // Echo the message back
        ws.send(JSON.stringify({
          type: 'echo',
          originalMessage: data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`Client ${clientId} disconnected`);
    });
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  // Handle 404 errors
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
  
  // Start the server
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });