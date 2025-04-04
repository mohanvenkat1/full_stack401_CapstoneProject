const express = require('express');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');
const { admin, db } = require('./firebase-config');
const app = express();
const port = 3002;

// Twilio configuration (replace with your credentials)
const accountSid = 'AC98b9b8e584e9a745b38743f752f58510'; // Get from Twilio dashboard
const authToken = 'ca2f0b0aa26bfb2e24a651548eed82c8'; // Get from Twilio dashboard
const client = new twilio(accountSid, authToken);

// Nodemailer configuration (replace with your Gmail credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bookyourtickettravalease@gmail.com', // Your Gmail address
        pass: 'sdfk embn mayd lhan' // Generate an App Password from Google Account settings
    }
});

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Simulated train data (using Firestore collection later)
let trains = [
    { id: 12621, name: "Tamil Nadu Express", source: "new delhi", destination: "chennai central", departure: "22:30", seats: 10, fare: 1850, status: "Available", pnr: "1234567890" },
    { id: 12431, name: "Rajdhani Express", source: "new delhi", destination: "trivandrum central", departure: "20:50", seats: 5, fare: 3050, status: "Available", pnr: "0987654321" },
    { id: 12951, name: "Mumbai Rajdhani", source: "mumbai central", destination: "new delhi", departure: "17:00", seats: 15, fare: 2800, status: "Available", pnr: "4567891230" }
];

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Initialize Firestore collections
const usersCollection = db.collection('users');
const bookingsCollection = db.collection('bookings');
const trainsCollection = db.collection('trains');

// Initialize trains in Firestore if not exists
async function initializeTrains() {
    try {
        const snapshot = await trainsCollection.get();
        if (snapshot.empty) {
            console.log('Initializing trains in Firestore...');
            const batch = db.batch();
            trains.forEach(train => {
                const docRef = trainsCollection.doc(train.id.toString());
                batch.set(docRef, train);
            });
            await batch.commit();
            console.log('Trains initialized in Firestore');
        } else {
            console.log('Trains already exist in Firestore');
        }
    } catch (error) {
        console.error('Error initializing trains:', error);
        // Fallback to in-memory trains array if Firestore fails
        console.log('Using in-memory trains data instead');
    }
}

// Call initialize function
initializeTrains().catch(console.error);

// Home page
app.get('/', async (req, res) => {
    try {
        // Try to fetch trains from Firestore for initial display
        const snapshot = await trainsCollection.get();
        let trainsList = [];
        
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                trainsList.push(doc.data());
            });
            console.log(`Retrieved ${trainsList.length} trains from Firestore`);
        } else {
            // If no trains in Firestore, use the local array
            trainsList = trains;
            console.log('Using local trains array as fallback');
        }
        
        res.render('index', { 
            trains: trainsList,
            showTrains: trainsList.length > 0 
        });
    } catch (error) {
        console.error('Error fetching trains:', error);
        // Fallback to in-memory array in case of error
        res.render('index', { 
            trains: trains,
            showTrains: trains.length > 0 
        });
    }
});

// Send OTP via SMS
app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone.match(/^\+91\d{10}$/)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }
    const otp = generateOTP();
    
    try {
        // Store OTP in Firestore
        await usersCollection.doc(phone).set({
            otp,
            verified: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        client.messages
            .create({
                body: `Your TravelEase OTP is: ${otp}`,
                from: '+17652469922', // Your Twilio phone number
                to: phone
            })
            .then(() => res.json({ success: true }))
            .catch(err => {
                console.error(err);
                res.status(500).json({ success: false, error: 'Failed to send OTP' });
            });
    } catch (error) {
        console.error('Firestore error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Verify OTP
app.post('/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    
    try {
        const userDoc = await usersCollection.doc(phone).get();
        if (userDoc.exists && userDoc.data().otp === otp) {
            await usersCollection.doc(phone).update({ verified: true });
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Firestore error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, phone, role, idNumber } = req.body;
    
    try {
        const userDoc = await usersCollection.doc(phone).get();
        if (!userDoc.exists || !userDoc.data().verified) {
            return res.status(401).json({ success: false, error: 'Phone not verified' });
        }
        
        // Check for valid ID in appropriate collection
        const idCollectionRef = db.collection('idDatabase').doc(role === 'student' ? 'students' : 'professionals');
        const idDoc = await idCollectionRef.get();
        
        if (!idDoc.exists) {
            // Initialize ID database if not exists
            const idData = {
                students: ["CS12345", "ME67890", "IT54321"],
                professionals: ["REG001", "REG002", "REG003"]
            };
            await db.collection('idDatabase').doc('students').set({ ids: idData.students });
            await db.collection('idDatabase').doc('professionals').set({ ids: idData.professionals });
        }
        
        // Re-fetch after potential initialization
        const refreshedIdDoc = await idCollectionRef.get();
        const validIds = refreshedIdDoc.data().ids || [];
        const isValidId = validIds.includes(idNumber);
        
        if (!isValidId) {
            return res.status(400).json({ success: false, error: 'Invalid ID' });
        }
        
        // Update user record with additional info
        await usersCollection.doc(phone).update({
            username,
            role,
            idNumber,
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, user: { username, role, idNumber } });
    } catch (error) {
        console.error('Firestore error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Search trains
app.post('/search-trains', async (req, res) => {
    const { source, destination, date } = req.body;
    const sourceLower = source.toLowerCase();
    const destinationLower = destination.toLowerCase();
    
    try {
        // Case-insensitive search requires a client-side filter 
        // as Firestore doesn't support case-insensitive queries directly
        const snapshot = await trainsCollection.get();
        
        const trains = [];
        snapshot.forEach(doc => {
            const train = doc.data();
            if (train.source.toLowerCase() === sourceLower && 
                train.destination.toLowerCase() === destinationLower) {
                trains.push(train);
            }
        });
        
        res.json({ success: true, trains });
    } catch (error) {
        console.error('Firestore error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Book train ticket
app.post('/book-train', async (req, res) => {
    const { trainId, user } = req.body;
    
    try {
        // Get train from Firestore
        const trainDoc = await trainsCollection.doc(trainId.toString()).get();
        if (!trainDoc.exists) {
            return res.status(404).json({ success: false, error: 'Train not found' });
        }
        
        const train = trainDoc.data();
        const discount = user.role === 'student' ? 0.15 : 0;
        const finalFare = train.fare * (1 - discount);
        
        let bookingStatus = 'Confirmed';
        let trainStatus = 'Available';
        let seatsLeft = train.seats;
        
        if (train.seats > 0) {
            seatsLeft = train.seats - 1;
            trainStatus = seatsLeft === 0 ? 'Waitlist' : 'Available';
        } else {
            bookingStatus = 'Waitlist';
        }
        
        // Update train seats count
        await trainsCollection.doc(trainId.toString()).update({
            seats: seatsLeft,
            status: trainStatus
        });
        
        // Create booking record
        const bookingRef = await bookingsCollection.add({
            trainId,
            trainName: train.name,
            user: user,
            status: bookingStatus,
            finalFare,
            pnr: train.pnr,
            bookingTime: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const booking = {
            id: bookingRef.id,
            train: train,
            status: bookingStatus,
            finalFare,
            pnr: train.pnr
        };
        
        res.json({ success: true, booking });
    } catch (error) {
        console.error('Firestore error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Send booking confirmation email
app.post('/confirm-booking', async (req, res) => {
    const { email, bookingDetails, bookingId } = req.body;
    
    try {
        const mailOptions = {
            from: 'bookyourtickettravalease@gmail.com',
            to: email,
            subject: 'TravelEase Booking Confirmation',
            text: `Your booking is confirmed!\n\n${bookingDetails}`
        };
        
        // Update booking with payment info
        if (bookingId) {
            await bookingsCollection.doc(bookingId).update({
                paymentStatus: 'Completed',
                emailSent: true,
                email
            });
        }

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error(error);
                res.status(500).json({ success: false, error: 'Failed to send email' });
            } else {
                res.json({ success: true });
            }
        });
    } catch (error) {
        console.error('Firestore error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});