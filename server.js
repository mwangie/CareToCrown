const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = ['http://localhost:8080', 'http://localhost:8000'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPEG, or PNG files are allowed'));
        }
    }
});

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, 'tokens.json');
const USERS_PATH = path.join(__dirname, 'users.json');
const UPLOADS_PATH = path.join(__dirname, 'uploads');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendWhatsApp(to, message) {
    try {
        await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${to}`,
            body: message
        });
        console.log(`[DEBUG] WhatsApp sent to ${to}: ${message}`);
    } catch (err) {
        console.error('[DEBUG] Error sending WhatsApp:', err.message, err.stack);
        throw err;
    }
}

async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({
            from: '"Care to Crown Medical Booking System" <' + process.env.EMAIL_USER + '>',
            to,
            subject,
            text
        });
        console.log(`[DEBUG] Email sent to ${to}: ${subject}`);
    } catch (err) {
        console.error('[DEBUG] Error sending email:', err.message);
    }
}

async function loadTokens() {
    try {
        await fs.access(TOKEN_PATH);
        const content = await fs.readFile(TOKEN_PATH);
        console.log('[DEBUG] Loaded tokens from tokens.json');
        return JSON.parse(content);
    } catch (err) {
        console.log('[DEBUG] tokens.json not found, initializing empty tokens');
        return {};
    }
}

async function saveTokens(tokens) {
    try {
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('[DEBUG] Tokens successfully saved to tokens.json');
    } catch (err) {
        console.error('[DEBUG] Error saving tokens to tokens.json:', err.message);
        throw new Error(`Failed to save tokens: ${err.message}`);
    }
}

async function loadUsers() {
    try {
        await fs.access(USERS_PATH);
        const content = await fs.readFile(USERS_PATH);
        console.log('[DEBUG] Loaded users from users.json');
        return JSON.parse(content);
    } catch (err) {
        console.log('[DEBUG] users.json not found, initializing with default users');
        const defaultUsers = {
            doctors: [
                { id: 1, name: "Dr. Alice Smith", username: "alice", password: "pass123", location: "Riverwalk Mall, Gaborone", cellphone: "whatsapp:+26772120599", email: "mwangieb@gmail.com" }
            ],
            pharmacists: [
                { id: 1, name: "Pharmacist Jane", username: "jane", password: "pharm123", cellphone: "whatsapp:+26772120599", email: "mwangieb@gmail.com" }
            ],
            patients: [
                { id: 1, name: "John Doe", username: "john", password: "1234", location: "Maruapula, Gaborone", cellphone: "whatsapp:+26772120599", email: "mwangieb@gmail.com" }
            ],
            transporters: [
                { id: 1, name: "YangoTaxi", username: "yango", password: "4321", cellphone: "whatsapp:+26772120599" }
            ]
        };
        await fs.writeFile(USERS_PATH, JSON.stringify(defaultUsers, null, 2));
        return defaultUsers;
    }
}

async function saveUsers(users) {
    try {
        await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
        console.log('[DEBUG] Users successfully saved to users.json');
    } catch (err) {
        console.error('[DEBUG] Error saving users to users.json:', err.message);
        throw new Error(`Failed to save users: ${err.message}`);
    }
}

app.get('/providers', async (req, res) => {
    try {
        const users = await loadUsers();
        console.log('[DEBUG] Sending providers:', { doctors: users.doctors, pharmacists: users.pharmacists, transporters: users.transporters });
        res.json({ doctors: users.doctors, pharmacists: users.pharmacists, patients: users.patients, transporters: users.transporters });
    } catch (err) {
        console.error('[DEBUG] Error fetching providers:', err.message);
        res.status(500).json({ error: `Failed to fetch providers: ${err.message}` });
    }
});

app.post('/signup', async (req, res) => {
    const { role, name, username, password, location, cellphone, email } = req.body;
    console.log(`[DEBUG] Signup request for role: ${role}, username: ${username}`);
    try {
        if (!role || !name || !username || !password) {
            throw new Error('Missing required fields');
        }
        const users = await loadUsers();
        let userList;
        if (role === 'doctor') {
            userList = users.doctors;
        } else if (role === 'patient') {
            userList = users.patients;
        } else if (role === 'transporter') {
            userList = users.transporters;
        } else if (role === 'pharmacist') {
            userList = users.pharmacists;
        } else {
            throw new Error('Invalid role');
        }
        if (userList.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('Username already exists');
        }
        const newUser = {
            id: userList.length + 1,
            name,
            username,
            password,
            location: location || '',
            cellphone: cellphone || '',
            email: email || ''
        };
        userList.push(newUser);
        await saveUsers(users);
        console.log(`[DEBUG] User signed up: ${role} ${name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Signup error:', err.message);
        res.status(500).json({ error: `Failed to sign up: ${err.message}` });
    }
});

app.use(cors({
  origin: 'https://care-to-crown-medical-booking.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, '.')));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

app.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const usersPath = path.join(__dirname, 'users.json');
    if (!fs.existsSync(usersPath)) {
      console.error('users.json not found at:', usersPath);
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    const users = JSON.parse(fs.readFileSync(usersPath));
    const user = [...users.doctors, ...users.pharmacists, ...users.patients, ...users.transporters]
      .find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//app.listen(process.env.PORT || 3001, () => {
//  console.log(`Server running at http://localhost:${process.env.PORT || 3001}`);
//});

app.get('/auth/google', (req, res) => {
    const { doctorId } = req.query;
    console.log(`[DEBUG] Generating OAuth URL for doctorId: ${doctorId}`);
    try {
        if (!doctorId) {
            throw new Error('Missing doctorId parameter');
        }
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: doctorId,
            prompt: 'consent'
        });
        console.log(`[DEBUG] OAuth URL generated: ${url}`);
        res.json({ authUrl: url });
    } catch (err) {
        console.error('[DEBUG] Error generating OAuth URL:', err.message);
        res.status(500).json({ error: `Failed to generate OAuth URL: ${err.message}` });
    }
});

app.get('/auth/google/callback', async (req, res) => {
    const { code, state: doctorId, error } = req.query;
    console.log(`[DEBUG] OAuth callback received: doctorId=${doctorId}, code=${code}, error=${error}`);
    try {
        if (error) {
            throw new Error(`OAuth error from Google: ${error}`);
        }
        if (!code || !doctorId) {
            throw new Error('Missing code or doctorId in callback');
        }
        console.log('[DEBUG] Exchanging code for tokens with client_id:', process.env.GOOGLE_CLIENT_ID);
        const { tokens } = await oauth2Client.getToken(code);
        console.log(`[DEBUG] Tokens received for doctorId ${doctorId}:`, tokens);
        const allTokens = await loadTokens();
        allTokens[doctorId] = tokens;
        await saveTokens(allTokens);
        res.send('<script>window.close(); window.opener.postMessage({ type: "auth_complete" }, "*");</script>');
    } catch (err) {
        console.error('[DEBUG] OAuth callback error:', err.message, err.stack);
        res.status(500).send(`Authentication failed: ${err.message}`);
    }
});

app.get('/calendar/events', async (req, res) => {
    const { doctorId, start, end } = req.query;
    console.log(`[DEBUG] Fetching events for doctorId: ${doctorId}, start: ${start}, end: ${end}`);
    try {
        if (!doctorId || !start || !end) {
            throw new Error('Missing required query parameters');
        }
        const allTokens = await loadTokens();
        const tokens = allTokens[doctorId];
        if (!tokens) {
            console.log(`[DEBUG] No tokens found for doctorId: ${doctorId}`);
            return res.status(401).json({ error: 'Doctor not authenticated' });
        }
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: start,
            timeMax: end,
            singleEvents: true,
            orderBy: 'startTime'
        });
        const events = response.data.items || [];
        const availableSlots = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            for (let hour = 9; hour < 17; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const slotTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute);
                    if (slotTime >= new Date()) {
                        const isBooked = events.some(e => {
                            const eventStart = new Date(e.start.dateTime);
                            return eventStart.getTime() === slotTime.getTime();
                        });
                        if (!isBooked) {
                            availableSlots.push({
                                title: 'Available',
                                start: slotTime.toISOString(),
                                end: new Date(slotTime.getTime() + 30 * 60000).toISOString(),
                                extendedProps: { status: 'available' }
                            });
                        }
                    }
                }
            }
        }
        const formattedEvents = events.map(e => ({
            title: e.summary.includes('Blocked') ? 'Blocked' : `Reserved: ${e.summary}`,
            start: e.start.dateTime,
            end: e.end.dateTime,
            extendedProps: { status: e.summary.includes('Blocked') ? 'blocked' : 'reserved' }
        }));
        console.log('[DEBUG] Sending events:', [...formattedEvents, ...availableSlots]);
        res.json([...formattedEvents, ...availableSlots]);
    } catch (err) {
        console.error('[DEBUG] Calendar fetch error:', err.message);
        res.status(500).json({ error: `Failed to fetch events: ${err.message}` });
    }
});

app.post('/calendar/book', async (req, res) => {
    const { doctorId, patientName, startTime, role } = req.body;
    console.log(`[DEBUG] Booking appointment for ${role}Id: ${doctorId}, patient: ${patientName}, startTime: ${startTime}`);
    try {
        if (!doctorId || !patientName || !startTime || !role) {
            throw new Error('Missing required body parameters');
        }
        const allTokens = await loadTokens();
        const tokens = allTokens[doctorId];
        if (!tokens) {
            console.log(`[DEBUG] No tokens found for ${role}Id: ${doctorId}`);
            return res.status(401).json({ error: `${role} not authenticated` });
        }
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const slotEnd = new Date(new Date(startTime).getTime() + 30 * 60000);
        const event = {
            summary: `Appointment with ${patientName}`,
            start: { dateTime: startTime },
            end: { dateTime: slotEnd.toISOString() }
        };
        await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        console.log('[DEBUG] Appointment booked successfully');
        const users = await loadUsers();
        const target = role === 'doctor' ? users.doctors.find(d => d.id === parseInt(doctorId)) : users.pharmacists.find(p => p.id === parseInt(doctorId));
        const patient = users.patients.find(p => p.name === patientName);
        if (!target) {
            throw new Error(`No ${role} found with ID ${doctorId}`);
        }
        if (!patient) {
            throw new Error(`No patient found with name ${patientName}`);
        }
        const formattedDate = new Date(startTime).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(/(\d+)(?:st|nd|rd|th)/, (match, day) => {
            const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
            return day + (suffixes[day % 10] || 'th');
        });
        if (patient.cellphone) {
            await sendWhatsApp(patient.cellphone.replace('whatsapp:', ''), `Appointment booked with ${target.name} at ${formattedDate}`);
        } else {
            console.log(`[DEBUG] No cellphone for patient ${patientName}`);
        }
        if (target.cellphone) {
            await sendWhatsApp(target.cellphone.replace('whatsapp:', ''), `New appointment with ${patientName} at ${formattedDate}`);
        } else {
            console.log(`[DEBUG] No cellphone for ${role} ${target.name}`);
        }
        if (patient.email) {
            await sendEmail(patient.email, 'Appointment Confirmation', `Your appointment with ${target.name} is confirmed for ${formattedDate}.`);
        } else {
            console.log(`[DEBUG] No email for patient ${patientName}`);
        }
        if (target.email) {
            await sendEmail(target.email, 'New Appointment', `You have a new appointment with ${patientName} at ${formattedDate}.`);
        } else {
            console.log(`[DEBUG] No email for ${role} ${target.name}`);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Booking error:', err.message);
        res.status(500).json({ error: `Failed to book appointment: ${err.message}` });
    }
});

app.post('/calendar/block', async (req, res) => {
    const { doctorId, startTime } = req.body;
    console.log(`[DEBUG] Blocking slot for doctorId: ${doctorId}, startTime: ${startTime}`);
    try {
        if (!doctorId || !startTime) {
            throw new Error('Missing required body parameters');
        }
        const allTokens = await loadTokens();
        const tokens = allTokens[doctorId];
        if (!tokens) {
            console.log(`[DEBUG] No tokens found for doctorId: ${doctorId}`);
            return res.status(401).json({ error: 'Doctor not authenticated' });
        }
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const slotEnd = new Date(new Date(startTime).getTime() + 30 * 60000);
        const event = {
            summary: 'Blocked Slot',
            start: { dateTime: startTime },
            end: { dateTime: slotEnd.toISOString() }
        };
        await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        console.log('[DEBUG] Slot blocked successfully');
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Block slot error:', err.message);
        res.status(500).json({ error: `Failed to block slot: ${err.message}` });
    }
});

app.post('/calendar/allow', async (req, res) => {
    const { doctorId, eventId } = req.body;
    console.log(`[DEBUG] Allowing slot for doctorId: ${doctorId}, eventId: ${eventId}`);
    try {
        if (!doctorId || !eventId) {
            throw new Error('Missing required body parameters');
        }
        const allTokens = await loadTokens();
        const tokens = allTokens[doctorId];
        if (!tokens) {
            console.log(`[DEBUG] No tokens found for doctorId: ${doctorId}`);
            return res.status(401).json({ error: 'Doctor not authenticated' });
        }
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
            calendarId: 'primary',
            eventId
        });
        console.log('[DEBUG] Slot allowed successfully');
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Allow slot error:', err.message);
        res.status(500).json({ error: `Failed to allow slot: ${err.message}` });
    }
});

app.post('/notify-transporter', async (req, res) => {
    const { transporterId, appointment } = req.body;
    console.log(`[DEBUG] Notifying transporterId: ${transporterId}`);
    try {
        const users = await loadUsers();
        const transporter = users.transporters.find(t => t.id === parseInt(transporterId));
        const doctor = users.doctors.find(d => d.id === appointment.doctorId);
        const formattedDate = new Date(appointment.startTime).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(/(\d+)(?:st|nd|rd|th)/, (match, day) => {
            const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
            return day + (suffixes[day % 10] || 'th');
        });
        if (!transporter) {
            throw new Error(`No transporter found with ID ${transporterId}`);
        }
        if (!doctor) {
            throw new Error(`No doctor found with ID ${appointment.doctorId}`);
        }
        if (transporter.cellphone) {
            await sendWhatsApp(transporter.cellphone.replace('whatsapp:', ''), `New ride: ${appointment.patientName} from ${appointment.pickupLocation} to ${doctor.name} (${doctor.location}) at ${formattedDate}`);
        } else {
            console.log(`[DEBUG] No cellphone for transporter ${transporter.name}`);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Transporter notification error:', err.message);
        res.status(500).json({ error: `Failed to notify transporter: ${err.message}` });
    }
});

app.post('/prescription/upload', upload.single('prescription'), async (req, res) => {
    const { pharmacistId, patientName, startTime } = req.body;
    console.log(`[DEBUG] Uploading prescription for pharmacistId: ${pharmacistId}, patient: ${patientName}, startTime: ${startTime}`);
    try {
        if (!req.file || !pharmacistId || !patientName || !startTime) {
            throw new Error('Missing file or required body parameters');
        }
        const users = await loadUsers();
        const pharmacist = users.pharmacists.find(p => p.id === parseInt(pharmacistId));
        const patient = users.patients.find(p => p.name === patientName);
        if (!pharmacist) {
            throw new Error(`No pharmacist found with ID ${pharmacistId}`);
        }
        if (!patient) {
            throw new Error(`No patient found with name ${patientName}`);
        }
        const formattedDate = new Date(startTime).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(/(\d+)(?:st|nd|rd|th)/, (match, day) => {
            const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
            return day + (suffixes[day % 10] || 'th');
        });
        if (pharmacist.cellphone) {
            await sendWhatsApp(pharmacist.cellphone.replace('whatsapp:', ''), `New prescription from ${patientName} for ${formattedDate}`);
        } else {
            console.log(`[DEBUG] No cellphone for pharmacist ${pharmacist.name}`);
        }
        if (pharmacist.email) {
            await sendEmail(pharmacist.email, 'New Prescription', `New prescription from ${patientName} for ${formattedDate}.`);
        } else {
            console.log(`[DEBUG] No email for pharmacist ${pharmacist.name}`);
        }
        res.json({ success: true, filename: req.file.filename });
    } catch (err) {
        console.error('[DEBUG] Prescription upload error:', err.message);
        res.status(500).json({ error: `Failed to upload prescription: ${err.message}` });
    }
});

app.post('/prescription/ready', async (req, res) => {
    const { pharmacistId, patientName, startTime, pickupTime } = req.body;
    console.log(`[DEBUG] Notifying patient for prescription ready: pharmacistId=${pharmacistId}, patient=${patientName}`);
    try {
        if (!pharmacistId || !patientName || !startTime || !pickupTime) {
            throw new Error('Missing required body parameters');
        }
        const users = await loadUsers();
        const patient = users.patients.find(p => p.name === patientName);
        if (!patient) {
            throw new Error(`No patient found with name ${patientName}`);
        }
        const formattedPickup = new Date(pickupTime).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(/(\d+)(?:st|nd|rd|th)/, (match, day) => {
            const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
            return day + (suffixes[day % 10] || 'th');
        });
        if (patient.cellphone) {
            await sendWhatsApp(patient.cellphone.replace('whatsapp:', ''), `Your prescription is ready for collection on ${formattedPickup}`);
        } else {
            console.log(`[DEBUG] No cellphone for patient ${patientName}`);
        }
        if (patient.email) {
            await sendEmail(patient.email, 'Prescription Ready', `Your prescription is ready for collection on ${formattedPickup}.`);
        } else {
            console.log(`[DEBUG] No email for patient ${patientName}`);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Prescription ready notification error:', err.message);
        res.status(500).json({ error: `Failed to notify patient: ${err.message}` });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});
