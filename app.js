const express = require('express');
const compression = require('compression');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const axios = require('axios');


const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 6268;

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
  
  // Sample REST endpoints
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Screenova!'});
  });

  app.get('/student-details', async (req, res) => {
    try {
        const { regno } = req.body;
        if (!regno) {
            return res.status(400).json({ error: 'Registration number is required' });
        }
        const response = await axios.get('http://160.187.169.12/jspapi/personal_details.jsp?regno=' + regno, {
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