const express = require('express');
const compression = require('compression');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const axios = require('axios');
const multer = require('multer');
const upload = multer();
require('dotenv').config();
const {fetchData, writeData, updateData, deleteData ,fetchDataById} = require('./Firebase/firebaseDB');
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
  app.use(express.static(__dirname + '/src'));

  app.get('/', (req, res) => {
    const filePath = __dirname + '/src/index.html';
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'index.html not found' });
    }
    res.sendFile(filePath);
  });

  app.get('/create', (req, res) => {
    const filePath = __dirname + '/src/create.html';
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'create.html not found' });
    }
    res.sendFile(filePath);
  });

  app.get('/news', (req, res) => {
    const filePath = __dirname + '/src/newsData.html';
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'newsData.html not found' });
    }
    res.sendFile(filePath);
  });

  app.get('/user', (req, res) => {
    const filePath = __dirname + '/src/user.html';
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'user.html not found' });
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

  app.get('/allUsers/:username', async (req, res) => {
    const { username } = req.params;
    try {
      const userStats = await adminAuth.getAllUsers('Users');
      const filteredUsers = userStats.filter(
        user => {
          const userName = user.email.split('@')[0];
          return userName === username;
        }
      );
      if (filteredUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(filteredUsers[0]);
    } catch (error) {
        console.error('Error in allUsers:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  // followers
  app.get('/followers/:username', async (req, res) => {
    const { username } = req.params;
    try {
      const userStats = await adminAuth.getAllUsers(`user_followers/${username}`);
      res.json({
        followers: userStats,
        totalFollowers: userStats.length
      });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  app.get('/following/:username', async (req, res) => {
    const { username } = req.params;
    try {
      const userStats = await adminAuth.getAllUsers(`user_follows/${username}`);
      // in follow data in the form of "testing" is the user name  at the key value and "srinivaschari6268" is following user
      res.json({
        following: userStats,
        totalFollowing: userStats.length
      });
    } catch (error) {
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

  app.get('/supercoins/:username/:type', async (req, res) => {
    const { username, type } = req.params;
    try {
      const userStats = await adminAuth.getAllUsers(`Reports/${username}/${type}`);
      let totalCoins = 0;
      let numberOfPosts = 0;
      userStats.forEach((dataSnapshot) => {
        numberOfPosts++;
        const coins = dataSnapshot.viewCount || 0;
        totalCoins += coins;
      });      
      const supercoins = totalCoins * 0.1;
      const averageViews = totalCoins / numberOfPosts;
      res.json({ username, totalCoins , numberOfPosts , supercoins, averageViews });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

const clients = new Set();

app.post('/admin/news', upload.single('BlobData'), async (req, res) => {
    try {
        // Validate required fields
        const { userId, headline, summary, source, category, language, type } = req.body;
        if (!userId || !headline || !summary || !source || !category || !language || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Example: Save news post (replace with your DB logic)
        const newsPost = {
            userId,
            headline,
            summary,
            source,
            category,
            language,
            type,
            hashtags: req.body.hashtags,
            viewCount: req.body.viewCount || 0,
            timestamp: req.body.timestamp,
            mediaType: req.body.mediaType,
            fileOriginalName: req.file.originalname,
            fileMimeType: req.file.mimetype,
            fileSize: req.file.size
        };
        
        const newsPostPath = `Reports/admin/news_card`;
        const newsPostData = {
            ...newsPost,
            BlobData: req.file.buffer.toString('base64')
        };
        await writeData(newsPostPath, newsPostData, uuidv4());
        res.status(201).json({ message: 'News post created successfully', newsPost });

        // Broadcast to all connected clients
        broadcastToClients({
            type: 'news_created',
            newsPost
        });
    } catch (error) {
        console.error('Error in /admin/news:', error);
        res.status(500).json({ error: 'Failed to create news post' });
    }
});
app.get('/admin/news/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const newsPosts = await fetchData(`Reports/${username}/news_card`);
        if (!newsPosts) {
            return res.status(404).json({ error: 'No news posts found' });
        }
        const newsArray = Array.isArray(newsPosts)
            ? newsPosts
            : Object.values(newsPosts);
        res.json(newsArray);
    } catch (error) {
        console.error('Error in /admin/news:', error);
        res.status(500).json({ error: 'Failed to fetch news posts' });
    }
});

app.get('/admin/news/:username/:limit/:offset', async (req, res) => {
    const { username, limit = 10, offset = 0 } = req.params;
    try {
        const newsSnapshot = await fetchData(`Reports/${username}/news_card`);
        if (!newsSnapshot) {
            return res.status(404).json({ error: 'No news posts available' });
        }
        const newsArray = Array.isArray(newsSnapshot)
            ? newsSnapshot
            : Object.values(newsSnapshot);

        const paginatedNews = newsArray.slice(offset, offset + limit);
        
        res.json({
            news: paginatedNews,
            total: newsArray.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to load news' });
    }
});

app.get('/admin/reels', async (req, res) => {
    try {
        const reportsSnapshot = await fetchData('Reports');

        if (!reportsSnapshot) {
            return res.status(404).json({ error: 'No reels available' });
        }

        const allReels = [];

        for (const [username, userData] of Object.entries(reportsSnapshot)) {
            const personalReels = userData.personal_reel;
            if (personalReels) {
                for (const [postId, post] of Object.entries(personalReels)) {
                    const videoId = post.id || '';
                    const userId = post.userId || '';
                    const headline = post.headline || '';
                    const hashtags = post.hashtags || '';
                    const caption = `${headline}${hashtags ? '\n' + hashtags : ''}`;
                    const videoUrl = post.BlobData || '';
                    const viewCount = post.viewCount || 0;

                    if (userId && videoUrl && videoId) {
                        allReels.push({
                            videoId,
                            userId,
                            caption,
                            videoUrl,
                            viewCount
                        });
                    }
                }
            }
        }

        res.json(allReels);
    } catch (error) {
        console.error('Error fetching reels:', error);
        res.status(500).json({ error: 'Failed to load reels' });
    }
});

app.get('/admin/reels/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const userReels = await fetchData(`Reports/${username}/personal_reel`);
        
        if (!userReels) {
            return res.status(404).json({ error: 'No reels found' });
        }

        const reelsArray = Object.values(userReels).map(reel => {
            const videoId = reel.id || '';
            const userId = reel.userId || '';
            const headline = reel.headline || '';
            const hashtags = reel.hashtags || '';
            const caption = `${headline}${hashtags ? '\n' + hashtags : ''}`;
            const videoUrl = reel.BlobData || '';
            const viewCount = reel.viewCount || 0;

            return {
                videoId,
                userId,
                caption,
                videoUrl,
                viewCount
            };
        });

        res.json(reelsArray);
    } catch (error) {
        console.error('Error in /admin/reels/:username:', error);
        res.status(500).json({ error: 'Failed to fetch reel posts' });
    }
});

app.get('/admin/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const newsPost = await fetchDataById('News', id);
        if (!newsPost) {
            return res.status(404).json({ error: 'News post not found' });
        }
        res.json(newsPost);
    } catch (error) {
        console.error('Error in /admin/news/:id:', error);
        res.status(500).json({ error: 'Failed to fetch news post' });
    }
});

app.put('/admin/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { userId, headline, summary, source, category, language, type } = req.body;
        if (!userId || !headline || !summary || !source || !category || !language || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const newsPost = {
            userId,
            headline,
            summary,
            source,
            category,
            language,
            type
        };
        await updateData('News', id, newsPost);
        res.json({ message: 'News post updated successfully', newsPost });
    } catch (error) {
        console.error('Error in /admin/news/:id:', error);
        res.status(500).json({ error: 'Failed to update news post' });
    }
});
app.delete('/admin/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteData('News', id);
        res.json({ message: 'News post deleted successfully' });

        broadcastToClients({
            type: 'news_deleted',
            newsId: id
        });
    } catch (error) {
        console.error('Error in /admin/news/:id:', error);
        res.status(500).json({ error: 'Failed to delete news post' });
    }
});

wss.on('connection', (ws) => {
    console.log('Client connected');
    const clientId = uuidv4();
    ws.id = clientId;
    clients.add(ws);

    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to server',
      clientId
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received message from ${clientId}:`, data);

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

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Client ${clientId} disconnected`);
    });
});

function broadcastToClients(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
  
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });