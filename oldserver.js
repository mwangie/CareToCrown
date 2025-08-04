const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors({ origin: ['http://localhost:8000', 'http://localhost:8080'] }));
app.use(express.json());

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, 'tokens.json');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

async function loadTokens() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        return JSON.parse(content);
    } catch (err) {
        return {};
    }
}

async function saveTokens(tokens) {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
}

app.get('/auth/google', (req, res) => {
    const { doctorId } = req.query;
    console.log(`[DEBUG] Generating OAuth URL for doctorId: ${doctorId}`);
    try {
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: doctorId
        });
        console.log(`[DEBUG] OAuth URL: ${url}`);
        res.json({ authUrl: url });
    } catch (err) {
        console.error('[DEBUG] Error generating OAuth URL:', err.message);
        res.status(500).json({ error: 'Failed to generate OAuth URL' });
    }
});

app.get('/auth/google/callback', async (req, res) => {
    const { code, state: doctorId } = req.query;
    console.log(`[DEBUG] OAuth callback for doctorId: ${doctorId}`);
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log(`[DEBUG] Tokens received for doctorId ${doctorId}`);
        const allTokens = await loadTokens();
        allTokens[doctorId] = tokens;
        await saveTokens(allTokens);
        res.send('<script>window.close();</script>');
    } catch (err) {
        console.error('[DEBUG] OAuth callback error:', err.message);
        res.status(500).send('Authentication failed');
    }
});

app.get('/calendar/events', async (req, res) => {
    const { doctorId, start, end } = req.query;
    console.log(`[DEBUG] Fetching events for doctorId: ${doctorId}`);
    try {
        const allTokens = await loadTokens();
        const tokens = allTokens[doctorId];
        if (!tokens) {
            console.log(`[DEBUG] No tokens for doctorId: ${doctorId}`);
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
                                extendedProps: { status: 'available' }
                            });
                        }
                    }
                }
            }
        }
        const formattedEvents = events.map(e => ({
            title: e.summary,
            start: e.start.dateTime,
            end: e.end.dateTime,
            extendedProps: { status: 'booked' }
        }));
        res.json([...formattedEvents, ...availableSlots]);
    } catch (err) {
        console.error('[DEBUG] Calendar fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

app.post('/calendar/book', async (req, res) => {
    const { doctorId, patientName, startTime } = req.body;
    console.log(`[DEBUG] Booking appointment for doctorId: ${doctorId}, patient: ${patientName}`);
    try {
        const allTokens = await loadTokens();
        const tokens = allTokens[doctorId];
        if (!tokens) {
            console.log(`[DEBUG] No tokens for doctorId: ${doctorId}`);
            return res.status(401).json({ error: 'Doctor not authenticated' });
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
        res.json({ success: true });
    } catch (err) {
        console.error('[DEBUG] Booking error:', err.message);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});