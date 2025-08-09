const express = require('express');
     const path = require('path');
     const fs = require('fs');
     const cors = require('cors');
     const app = express();

     // Enable CORS for the Render frontend
     app.use(cors({
       origin: 'https://care-to-crown-medical-booking.onrender.com',
       methods: ['GET', 'POST', 'PUT', 'DELETE'],
       credentials: true
     }));

     app.use(express.static(path.join(__dirname, '.')));
     app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
     const TOKEN_PATH = path.join(__dirname, 'Uploads', 'tokens.json');
     // ... existing Google Calendar, Twilio, Nodemailer code ...
     app.listen(process.env.PORT || 3001, () => {
       console.log(`Server running at http://localhost:${process.env.PORT || 3001}`);
     });