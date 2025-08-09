const express = require('express');
       const { MongoClient } = require('mongodb');
       const path = require('path');
       const cors = require('cors');
       const app = express();

       app.use(cors({ origin: 'https://care-to-crown-medical-booking.onrender.com', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
       app.use(express.json());
       app.use(express.static(path.join(__dirname, '.')));
       app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

       const uri = 'mongodb+srv://C2CMongo:<db_password>@c2ccluster.3ewmclf.mongodb.net/?retryWrites=true&w=majority&appName=C2CCluster';
       
       const client = new MongoClient(uri);

       async function connectDB() {
         try {
           await client.connect();
           console.log('Connected to MongoDB');
         } catch (error) {
           console.error('MongoDB connection error:', error);
         }
       }
       connectDB();

       // Store tokens
       async function saveTokens(token) {
         const db = client.db('care-to-crown');
         await db.collection('tokens').updateOne({}, { $set: { token } }, { upsert: true });
       }

       // Retrieve tokens
       async function getTokens() {
         const db = client.db('care-to-crown');
         const result = await db.collection('tokens').findOne({});
         return result ? result.token : null;
       }

       // Update login to use MongoDB
       app.post('/login', async (req, res) => {
         try {
           const { username, password } = req.body;
           if (!username || !password) {
             return res.status(400).json({ success: false, message: 'Username and password required' });
           }
           const db = client.db('care-to-crown');
           const user = await db.collection('users').findOne({
             username: { $regex: `^${username}$`, $options: 'i' },
             password
           });
           if (!user) {
             return res.status(401).json({ success: false, message: 'Invalid credentials' });
           }
           res.json({ success: true, user });
         } catch (error) {
           console.error('Login error:', error.message, error.stack);
           res.status(500).json({ success: false, message: 'Internal server error' });
         }
       });

       app.listen(process.env.PORT || 3001, () => {
         console.log(`Server running at http://localhost:${process.env.PORT || 3001}`);
       });