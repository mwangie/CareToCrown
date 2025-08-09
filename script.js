const BACKEND_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
let currentUser = null;

function initializeStorage() {
    console.log('[DEBUG] Initializing localStorage');
    try {
        if (!localStorage.getItem('appointments')) {
            localStorage.setItem('appointments', JSON.stringify([]));
        }
        if (!localStorage.getItem('waitingList')) {
            localStorage.setItem('waitingList', JSON.stringify([]));
        }
        console.log('[DEBUG] localStorage initialized successfully');
    } catch (err) {
        console.error('[DEBUG] Error initializing localStorage:', err.message);
        showNotification('Failed to initialize storage: ' + err.message);
    }
}

function formatDate(date) {
    return new Date(date).toLocaleString('en-GB', {
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
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (currentUser && currentUser.name && currentUser.role) {
        userInfo.textContent = `${currentUser.name} (${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)})`;
        userInfo.style.display = 'block';
    } else {
        userInfo.style.display = 'none';
    }
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('doctor-dashboard').style.display = 'none';
    document.getElementById('patient-dashboard').style.display = 'none';
    document.getElementById('transporter-dashboard').style.display = 'none';
    document.getElementById('pharmacist-dashboard').style.display = 'none';
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserInfo();
}

function showSignupForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('doctor-dashboard').style.display = 'none';
    document.getElementById('patient-dashboard').style.display = 'none';
    document.getElementById('transporter-dashboard').style.display = 'none';
    document.getElementById('pharmacist-dashboard').style.display = 'none';
    updateUserInfo();
}

function showDashboard(role) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('doctor-dashboard').style.display = role === 'doctor' ? 'block' : 'none';
    document.getElementById('patient-dashboard').style.display = role === 'patient' ? 'block' : 'none';
    document.getElementById('transporter-dashboard').style.display = role === 'transporter' ? 'block' : 'none';
    document.getElementById('pharmacist-dashboard').style.display = role === 'pharmacist' ? 'block' : 'none';
    updateUserInfo();
    if (role === 'doctor') {
        initDoctorCalendar();
        displayDoctorAppointments();
    } else if (role === 'patient') {
        initPatientDashboard();
        displayPatientAppointments();
    } else if (role === 'transporter') {
        initTransporterDashboard();
    } else if (role === 'pharmacist') {
        initPharmacistCalendar();
        displayPharmacistAppointments();
    }
}

function logout() {
    console.log('[DEBUG] Logging out user:', currentUser);
    showNotification('Logged out successfully.');
    showLoginForm();
}

async function loginUser(event) {
    event.preventDefault();
    console.log('[DEBUG] Attempting login');
    try {
        const username = document.getElementById('username').value.toLowerCase();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, username, password })
        });
        console.log('[DEBUG] Login response:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Login failed: ${errorText}`);
        }
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('[DEBUG] Login successful:', currentUser);
            showNotification('Login successful!');
            showDashboard(role);
        } else {
            console.log('[DEBUG] Login failed: Invalid credentials');
            showNotification('Invalid username or password.');
        }
    } catch (err) {
        console.error('[DEBUG] Login error:', err.message);
        showNotification('Login failed: ' + err.message);
    }
}

async function signupUser(event) {
    event.preventDefault();
    console.log('[DEBUG] Attempting signup');
    try {
        const name = document.getElementById('signup-name').value;
        const username = document.getElementById('signup-username').value.toLowerCase();
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;
        const location = document.getElementById('signup-location').value || '';
        const cellphone = document.getElementById('signup-cellphone').value || '';
        const email = document.getElementById('signup-email').value || '';

<<<<<<< HEAD
        const response = await fetch(`/signup`, {
=======
        const response = await fetch('/signup', {
>>>>>>> 3f1e2d002bf84cba3ff0ace6aff37ae2294cca42
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, name, username, password, location, cellphone, email })
        });
        console.log('[DEBUG] Signup response:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Signup failed: ${errorText}`);
        }
        const data = await response.json();
        if (data.success) {
            console.log('[DEBUG] Signup successful:', { role, name, username });
            showNotification('Signup successful! Please log in.');
            showLoginForm();
            localStorage.removeItem('doctors');
            localStorage.removeItem('pharmacists');
            localStorage.removeItem('patients');
            localStorage.removeItem('transporters');
        } else {
            console.log('[DEBUG] Signup failed:', data.error);
            showNotification('Signup failed: ' + data.error);
        }
    } catch (err) {
        console.error('[DEBUG] Signup error:', err.message);
        showNotification('Signup failed: ' + err.message);
    }
}

// function togglePassword(fieldId, toggleId) {
//     const field = document.getElementById(fieldId);
//     const toggle = document.getElementById(toggleId);
//     if (field.type === 'password') {
//         field.type = 'text';
//         toggle.textContent = '🙈';
//     } else {
//         field.type = 'password';
//         toggle.textContent = '👁️';
//     }
// }

function togglePickupLocation() {
    const transportRequired = document.getElementById('transport-required').checked;
    document.getElementById('pickup-location').style.display = transportRequired ? 'block' : 'none';
}

function togglePrescriptionFile() {
    const role = document.getElementById('role-select').value;
    document.getElementById('prescription-file').style.display = role === 'pharmacist' ? 'block' : 'none';
}

async function initGoogleAuth() {
    try {
        if (!currentUser || !currentUser.id) {
            throw new Error('No user logged in or invalid user ID');
        }
        console.log('[DEBUG] Initiating Google Calendar auth for', currentUser.role, 'Id:', currentUser.id);
        const url = `/auth/google?doctorId=${currentUser.id}`;
        console.log('[DEBUG] Fetching from:', url);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'same-origin'
        });
        console.log('[DEBUG] Fetch response:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        console.log('[DEBUG] Response data:', data);
        if (!data.authUrl) {
            throw new Error('No authUrl in response');
        }
        console.log('[DEBUG] Opening popup with URL:', data.authUrl);
        const popup = window.open(data.authUrl, 'GoogleAuth', 'width=500,height=600,menubar=no,toolbar=no');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            throw new Error('Popup blocked or failed to open. Please allow popups for this site.');
        }
        return new Promise((resolve) => {
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    console.log('[DEBUG] Popup closed, notifying user');
                    showNotification('Google Calendar linked successfully. Please refresh the calendar.');
                    if (currentUser.role === 'doctor') {
                        initDoctorCalendar();
                    } else if (currentUser.role === 'pharmacist') {
                        initPharmacistCalendar();
                    }
                    resolve();
                }
            }, 1000);
            window.addEventListener('message', (event) => {
                if (event.data.type === 'auth_complete') {
                    clearInterval(checkPopup);
                    console.log('[DEBUG] Auth complete message received');
                    showNotification('Google Calendar linked successfully. Please refresh the calendar.');
                    if (currentUser.role === 'doctor') {
                        initDoctorCalendar();
                    } else if (currentUser.role === 'pharmacist') {
                        initPharmacistCalendar();
                    }
                    resolve();
                }
            }, { once: true });
        });
    } catch (err) {
        console.error('[DEBUG] Authentication error:', err.message);
        showNotification('Failed to initiate Google Calendar authentication: ' + err.message);
    }
}

function initDoctorCalendar() {
    console.log('[DEBUG] Initializing doctor calendar for doctorId:', currentUser.id);
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error('[DEBUG] Calendar element not found');
        showNotification('Error: Calendar element not found.');
        return;
    }
    try {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            slotMinTime: '09:00:00',
            slotMaxTime: '17:00:00',
            selectable: true,
            eventClick: (info) => {
                console.log('[DEBUG] Doctor calendar event clicked:', info.event);
                if (info.event.extendedProps.status === 'available') {
                    if (confirm(`Block slot at ${formatDate(info.event.start)}?`)) {
                        fetch(`/calendar/block`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ doctorId: currentUser.id, startTime: info.event.start.toISOString() })
                        }).then(response => {
                            if (response.ok) {
                                showNotification('Slot blocked.');
                                calendar.refetchEvents();
                            } else {
                                showNotification('Failed to block slot.');
                            }
                        }).catch(err => showNotification('Error blocking slot: ' + err.message));
                    }
                } else if (info.event.extendedProps.status === 'blocked') {
                    if (confirm(`Allow slot at ${formatDate(info.event.start)}?`)) {
                        fetch(`/calendar/allow`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ doctorId: currentUser.id, eventId: info.event.id })
                        }).then(response => {
                            if (response.ok) {
                                showNotification('Slot allowed.');
                                calendar.refetchEvents();
                            } else {
                                showNotification('Failed to allow slot.');
                            }
                        }).catch(err => showNotification('Error allowing slot: ' + err.message));
                    }
                } else {
                    showNotification(`Reserved: ${info.event.title}`);
                }
            },
            events: async (info, successCallback, failureCallback) => {
                console.log('[DEBUG] Fetching doctor events from:', `/calendar/events?doctorId=${currentUser.id}&start=${info.start.toISOString()}&end=${info.end.toISOString()}`);
                try {
                    const response = await fetch(`/calendar/events?doctorId=${currentUser.id}&start=${info.start.toISOString()}&end=${info.end.toISOString()}`);
                    console.log('[DEBUG] Fetch response:', response.status, response.statusText);
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! Status: ${response.status} ${errorText}`);
                    }
                    const events = await response.json();
                    console.log('[DEBUG] Doctor calendar events:', events);
                    successCallback(events);
                } catch (err) {
                    console.error('[DEBUG] Error fetching doctor calendar:', err.message);
                    showNotification('Failed to load calendar: ' + err.message);
                    failureCallback(err);
                }
            }
        });
        console.log('[DEBUG] Rendering doctor calendar');
        calendar.render();
    } catch (err) {
        console.error('[DEBUG] Doctor calendar initialization error:', err.message);
        showNotification('Failed to initialize calendar: ' + err.message);
    }
}

async function displayDoctorAppointments() {
    const appointmentList = document.getElementById('doctor-appointments');
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    try {
        const response = await fetch(`/providers`);
        console.log('[DEBUG] Providers response for doctor appointments:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch providers: ${errorText}`);
        }
        const { patients } = await response.json();
        appointmentList.innerHTML = appointments
            .filter(a => a.doctorId === currentUser.id && a.role === 'doctor')
            .map(a => {
                const patient = patients.find(p => p.id === a.patientId) || { name: 'Unknown Patient', cellphone: 'N/A', email: 'N/A', location: 'N/A' };
                return `
                    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #4CAF50; border-radius: 5px;">
                        <strong>Patient:</strong> ${patient.name}<br>
                        <strong>Time:</strong> ${formatDate(a.startTime)}<br>
                        <strong>Cellphone:</strong> ${patient.cellphone || 'N/A'}<br>
                        <strong>Email:</strong> ${patient.email || 'N/A'}<br>
                        <strong>Location:</strong> ${patient.location || 'N/A'}
                    </div>`;
            }).join('');
    } catch (err) {
        console.error('[DEBUG] Error fetching providers for doctor appointments:', err.message);
        showNotification('Failed to load appointments: ' + err.message);
    }
}

async function initPatientDashboard() {
    const roleSelect = document.getElementById('role-select');
    const providerSelect = document.getElementById('provider-select');
    try {
        console.log('[DEBUG] Fetching providers from:', `/providers`);
        const response = await fetch(`/providers`);
        console.log('[DEBUG] Providers response:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch providers: ${errorText}`);
        }
        const { doctors, pharmacists } = await response.json();
        console.log('[DEBUG] Providers fetched:', { doctors, pharmacists });
        if (!doctors.length && !pharmacists.length) {
            showNotification('No providers available. Please sign up a doctor or pharmacist.');
            return;
        }
        roleSelect.onchange = () => {
            const role = roleSelect.value;
            const providers = role === 'doctor' ? doctors : pharmacists;
            providerSelect.innerHTML = '<option value="">Select Provider</option>' + providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            if (providers.length === 0) {
                showNotification(`No ${role}s available. Please sign up a ${role}.`);
            }
            togglePrescriptionFile();
        };
        providerSelect.onchange = () => {
            const providerId = providerSelect.value;
            const role = roleSelect.value;
            if (providerId && role) {
                console.log('[DEBUG] Initializing calendar for providerId:', providerId, 'role:', role);
                initPatientCalendar(providerId, role);
            } else {
                showNotification('Please select a provider.');
            }
        };
        displayPatientAppointments();
        roleSelect.dispatchEvent(new Event('change')); // Trigger initial population
    } catch (err) {
        console.error('[DEBUG] Error fetching providers:', err.message);
        showNotification('Failed to load providers: ' + err.message);
    }
}

function initPatientCalendar(providerId, role) {
    if (!providerId) {
        console.error('[DEBUG] No providerId provided for patient calendar');
        showNotification('Please select a provider.');
        return;
    }
    console.log('[DEBUG] Initializing patient calendar for', role, 'Id:', providerId);
    const calendarEl = document.getElementById('patient-calendar');
    if (!calendarEl) {
        console.error('[DEBUG] Patient calendar element not found');
        showNotification('Error: Patient calendar element not found.');
        return;
    }
    try {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            slotMinTime: '09:00:00',
            slotMaxTime: '17:00:00',
            selectable: true,
            eventClick: (info) => {
                console.log('[DEBUG] Patient calendar event details:', {
                    title: info.event.title,
                    start: info.event.start,
                    extendedProps: info.event.extendedProps
                });
                if (info.event.extendedProps && info.event.extendedProps.status === 'available') {
                    console.log('[DEBUG] Available slot selected:', info.event.start.toISOString());
                    const bookingTimeInput = document.getElementById('booking-time');
                    const bookingRoleInput = document.getElementById('booking-role');
                    const bookingForm = document.getElementById('booking-form');
                    if (bookingTimeInput && bookingRoleInput && bookingForm) {
                        bookingTimeInput.value = info.event.start.toISOString();
                        bookingRoleInput.value = role;
                        bookingForm.style.display = 'block';
                        showNotification('Slot selected. Please complete the booking form.');
                    } else {
                        console.error('[DEBUG] Booking form or inputs not found');
                        showNotification('Error: Booking form not found.');
                    }
                } else {
                    console.log('[DEBUG] Non-available slot clicked:', info.event.title);
                    showNotification('This slot is not available.');
                }
            },
            events: async (info, successCallback, failureCallback) => {
                console.log('[DEBUG] Fetching patient events from:', `/calendar/events?doctorId=${providerId}&start=${info.start.toISOString()}&end=${info.end.toISOString()}`);
                try {
                    const response = await fetch(`/calendar/events?doctorId=${providerId}&start=${info.start.toISOString()}&end=${info.end.toISOString()}`);
                    console.log('[DEBUG] Fetch response:', response.status, response.statusText);
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! Status: ${response.status} ${errorText}`);
                    }
                    const events = await response.json();
                    console.log('[DEBUG] Patient calendar events:', events);
                    successCallback(events);
                } catch (err) {
                    console.error('[DEBUG] Error fetching patient calendar:', err.message);
                    showNotification('Failed to load calendar: ' + err.message);
                    failureCallback(err);
                }
            }
        });
        console.log('[DEBUG] Rendering patient calendar');
        calendar.render();
    } catch (err) {
        console.error('[DEBUG] Patient calendar initialization error:', err.message);
        showNotification('Failed to initialize patient calendar: ' + err.message);
    }
}

async function displayPatientAppointments() {
    const appointmentList = document.getElementById('patient-appointments');
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    try {
        const response = await fetch(`/providers`);
        console.log('[DEBUG] Providers response for patient appointments:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch providers: ${errorText}`);
        }
        const { doctors, pharmacists, transporters } = await response.json();
        appointmentList.innerHTML = appointments
            .filter(a => a.patientId === currentUser.id)
            .map(a => {
                const provider = a.role === 'doctor' ? doctors.find(d => d.id === a.doctorId) : pharmacists.find(p => p.id === a.doctorId);
                const providerName = provider ? provider.name : 'Unknown Provider';
                const providerLocation = provider ? provider.location || 'N/A' : 'N/A';
                let transportDetails = '';
                if (a.transportRequired && a.role === 'doctor') {
                    const transporter = transporters.find(t => t.id === 1); // Assuming transporterId: 1
                    transportDetails = transporter 
                        ? `<br><strong>Transporter:</strong> ${transporter.name} (Cell: ${transporter.cellphone || 'N/A'})`
                        : '<br><strong>Transporter:</strong> Not assigned';
                }
                return `
                    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #4CAF50; border-radius: 5px;">
                        <strong>Role:</strong> ${a.role.charAt(0).toUpperCase() + a.role.slice(1)}<br>
                        <strong>Provider:</strong> ${providerName}<br>
                        <strong>Location:</strong> ${providerLocation}<br>
                        <strong>Time:</strong> ${formatDate(a.startTime)}${transportDetails}
                    </div>`;
            }).join('');
    } catch (err) {
        console.error('[DEBUG] Error fetching providers for patient appointments:', err.message);
        showNotification('Failed to load appointments: ' + err.message);
    }
}

async function bookAppointment(event) {
    event.preventDefault();
    try {
        const providerId = document.getElementById('provider-select').value;
        const role = document.getElementById('role-select').value;
        const startTime = document.getElementById('booking-time').value;
        const transportRequired = document.getElementById('transport-required').checked;
        const pickupLocation = document.getElementById('pickup-location').value;
        const prescriptionFile = document.getElementById('prescription-file').files[0];
        if (!providerId || !startTime || !role) {
            throw new Error('Provider, role, or time not selected');
        }
        if (transportRequired && !pickupLocation.trim()) {
            throw new Error('Pickup location required when transport is selected');
        }
        if (role === 'pharmacist' && !prescriptionFile) {
            throw new Error('Prescription file required for pharmacist appointment');
        }
        console.log('[DEBUG] Booking appointment:', { providerId, role, startTime, transportRequired, pickupLocation });
        const response = await fetch(`/calendar/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorId: providerId, patientName: currentUser.name, startTime, role })
        });
        console.log('[DEBUG] Booking response:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to book appointment: ${errorText}`);
        }
        let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const appointment = {
            id: appointments.length + 1,
            doctorId: parseInt(providerId),
            patientId: currentUser.id,
            patientName: currentUser.name,
            startTime,
            role,
            transportRequired,
            pickupLocation: transportRequired ? pickupLocation : ''
        };
        appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        if (transportRequired && role === 'doctor') {
            let waitingList = JSON.parse(localStorage.getItem('waitingList')) || [];
            waitingList.push(appointment);
            localStorage.setItem('waitingList', JSON.stringify(waitingList));
            console.log('[DEBUG] Sending WhatsApp notification to transporter');
            await fetch(`/notify-transporter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transporterId: 1, appointment })
            }).catch(err => console.error('[DEBUG] Error notifying transporter:', err.message));
        }
        if (role === 'pharmacist' && prescriptionFile) {
            const formData = new FormData();
            formData.append('prescription', prescriptionFile);
            formData.append('pharmacistId', providerId);
            formData.append('patientName', currentUser.name);
            formData.append('startTime', startTime);
            await fetch(`/prescription/upload`, {
                method: 'POST',
                body: formData
            }).then(response => response.json()).then(data => {
                if (data.success) {
                    appointment.prescriptionFile = data.filename;
                    localStorage.setItem('appointments', JSON.stringify(appointments));
                } else {
                    throw new Error(data.error);
                }
            });
        }
        document.getElementById('booking-form').style.display = 'none';
        showNotification(`Time slot booked for you at ${formatDate(startTime)}`);
        displayPatientAppointments();
        initPatientCalendar(providerId, role);
    } catch (err) {
        console.error('[DEBUG] Booking error:', err.message);
        showNotification('Failed to book appointment: ' + err.message);
    }
}

async function initTransporterDashboard() {
    const rideList = document.getElementById('ride-list');
    const waitingList = JSON.parse(localStorage.getItem('waitingList')) || [];
    try {
        const response = await fetch(`/providers`);
        console.log('[DEBUG] Providers response for rides:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch providers: ${errorText}`);
        }
        const { doctors } = await response.json();
        rideList.innerHTML = waitingList.map(ride => {
            const doctor = doctors.find(d => d.id === ride.doctorId);
            const doctorName = doctor ? doctor.name : 'Unknown Doctor';
            const doctorLocation = doctor ? doctor.location : 'N/A';
            return `
                <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #4CAF50; border-radius: 5px;">
                    <strong>Patient:</strong> ${ride.patientName}<br>
                    <strong>From:</strong> ${ride.pickupLocation}<br>
                    <strong>To:</strong> ${doctorName} (${doctorLocation})<br>
                    <strong>Time:</strong> ${formatDate(ride.startTime)}
                </div>`;
        }).join('');
    } catch (err) {
        console.error('[DEBUG] Error fetching providers for rides:', err.message);
        showNotification('Failed to load rides: ' + err.message);
    }
}

async function initPharmacistCalendar() {
    console.log('[DEBUG] Initializing pharmacist calendar for pharmacistId:', currentUser.id);
    const calendarEl = document.getElementById('pharmacist-calendar');
    if (!calendarEl) {
        console.error('[DEBUG] Pharmacist calendar element not found');
        showNotification('Error: Pharmacist calendar element not found.');
        return;
    }
    try {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            slotMinTime: '09:00:00',
            slotMaxTime: '17:00:00',
            selectable: true,
            eventClick: (info) => {
                console.log('[DEBUG] Pharmacist calendar event clicked:', info.event);
                if (info.event.extendedProps.status === 'reserved') {
                    const appointment = JSON.parse(localStorage.getItem('appointments')).find(a => a.startTime === info.event.start.toISOString() && a.role === 'pharmacist');
                    if (appointment && confirm(`Mark prescription for ${appointment.patientName} as ready?`)) {
                        const pickupTime = prompt('Enter pickup date and time (YYYY-MM-DD HH:MM):');
                        if (pickupTime) {
                            fetch(`/prescription/ready`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    pharmacistId: currentUser.id,
                                    patientName: appointment.patientName,
                                    startTime: appointment.startTime,
                                    pickupTime
                                })
                            }).then(response => {
                                if (response.ok) {
                                    showNotification('Prescription marked as ready.');
                                } else {
                                    showNotification('Failed to mark prescription.');
                                }
                            }).catch(err => showNotification('Error: ' + err.message));
                        }
                    }
                }
            },
            events: async (info, successCallback, failureCallback) => {
                console.log('[DEBUG] Fetching pharmacist events from:', `/calendar/events?doctorId=${currentUser.id}&start=${info.start.toISOString()}&end=${info.end.toISOString()}`);
                try {
                    const response = await fetch(`/calendar/events?doctorId=${currentUser.id}&start=${info.start.toISOString()}&end=${info.end.toISOString()}`);
                    console.log('[DEBUG] Fetch response:', response.status, response.statusText);
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! Status: ${response.status} ${errorText}`);
                    }
                    const events = await response.json();
                    console.log('[DEBUG] Pharmacist calendar events:', events);
                    successCallback(events);
                } catch (err) {
                    console.error('[DEBUG] Error fetching pharmacist calendar:', err.message);
                    showNotification('Failed to load calendar: ' + err.message);
                    failureCallback(err);
                }
            }
        });
        console.log('[DEBUG] Rendering pharmacist calendar');
        calendar.render();
    } catch (err) {
        console.error('[DEBUG] Pharmacist calendar initialization error:', err.message);
        showNotification('Failed to initialize calendar: ' + err.message);
    }
}

async function displayPharmacistAppointments() {
    const appointmentList = document.getElementById('pharmacist-appointments');
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    try {
        const response = await fetch(`/providers`);
        console.log('[DEBUG] Providers response for pharmacist appointments:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch providers: ${errorText}`);
        }
        const { patients } = await response.json();
        appointmentList.innerHTML = appointments
            .filter(a => a.doctorId === currentUser.id && a.role === 'pharmacist')
            .map(a => {
                const patient = patients.find(p => p.id === a.patientId) || { name: 'Unknown Patient', cellphone: 'N/A', email: 'N/A' };
                const prescriptionLink = a.prescriptionFile ? `<a href="/uploads/${a.prescriptionFile}" target="_blank">View Prescription</a>` : 'No Prescription';
                return `
                    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #4CAF50; border-radius: 5px;">
                        <strong>Patient:</strong> ${patient.name}<br>
                        <strong>Time:</strong> ${formatDate(a.startTime)}<br>
                        <strong>Prescription:</strong> ${prescriptionLink}<br>
                        <strong>Cellphone:</strong> ${patient.cellphone || 'N/A'}<br>
                        <strong>Email:</strong> ${patient.email || 'N/A'}
                    </div>`;
            }).join('');
    } catch (err) {
        console.error('[DEBUG] Error fetching providers for pharmacist appointments:', err.message);
        showNotification('Failed to load appointments: ' + err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOM loaded, initializing storage');
    initializeStorage();
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showDashboard(currentUser.role);
    } else {
        showLoginForm();
    }
});
