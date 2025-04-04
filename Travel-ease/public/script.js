// Client-side JavaScript for TravelEase
let currentUser = null;
let currentBooking = null;

// Event listeners
document.getElementById('profileBtn').addEventListener('click', toggleProfile);
document.getElementById('sendOtpBtn').addEventListener('click', sendOTP);
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('searchTrainsBtn').addEventListener('click', searchTrains);
document.getElementById('backToSearchBtn').addEventListener('click', backToSearch);
document.getElementById('payNowBtn').addEventListener('click', processPayment);
document.getElementById('backFromConfirmationBtn').addEventListener('click', backToSearch);
document.getElementById('liveChatBtn').addEventListener('click', () => alert('Live chat coming soon!'));

// Initial setup
window.onload = () => {
    updateUserStatus();
    document.getElementById('profileMenu').style.display = 'none';
    
    // If train results are displayed by default (server-rendered), make sure booking form is hidden
    if (document.getElementById('resultsSection').style.display === 'block') {
        document.getElementById('bookingForm').style.display = 'none';
    }
};

// Toggle profile menu
function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    menu.classList.toggle('active');
    menu.style.display = menu.classList.contains('active') ? 'block' : 'none';
}

// Send OTP
async function sendOTP() {
    const phone = document.getElementById('phone').value.trim();
    if (!phone.match(/^\+91\d{10}$/)) {
        document.getElementById('profileStatus').textContent = "Invalid phone number!";
        return;
    }

    const response = await fetch('/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    const result = await response.json();
    document.getElementById('profileStatus').textContent = result.success ? "OTP sent!" : result.error;
}

// Login with OTP verification
async function login() {
    const username = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const role = document.getElementById('role').value;
    const idNumber = document.getElementById('idNumber').value.trim().toUpperCase();
    const status = document.getElementById('profileStatus');

    status.textContent = '';

    if (!username || !phone || !otp || !role || !idNumber) {
        status.textContent = "Please fill in all fields!";
        return;
    }

    const otpResponse = await fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
    });
    const otpResult = await otpResponse.json();

    if (!otpResult.success) {
        status.textContent = otpResult.error;
        return;
    }

    const loginResponse = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, phone, role, idNumber })
    });
    const loginResult = await loginResponse.json();

    if (loginResult.success) {
        currentUser = loginResult.user;
        document.getElementById('profileMenu').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('profileBtn').textContent = username;
        status.textContent = "Login successful!";
        setTimeout(() => status.textContent = '', 2000);
        updateUserStatus();
    } else {
        status.textContent = loginResult.error;
    }
}

// Logout
function logout() {
    currentUser = null;
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('profileBtn').textContent = 'Profile';
    document.getElementById('profileStatus').textContent = '';
    document.getElementById('profileMenu').style.display = 'none';
    updateUserStatus();
}

// Update user status
function updateUserStatus() {
    const status = document.getElementById('userStatus');
    status.textContent = currentUser ?
        `Logged in as ${currentUser.username} (${currentUser.role}, ID: ${currentUser.idNumber})` :
        "Please log in to book trains.";
}

// Search trains
async function searchTrains() {
    const source = document.getElementById('source').value.toLowerCase().trim();
    const destination = document.getElementById('destination').value.toLowerCase().trim();
    const date = document.getElementById('date').value;

    if (!source || !destination || !date) {
        alert("Please fill in all fields!");
        return;
    }

    const response = await fetch('/search-trains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination, date })
    });
    
    const result = await response.json();
    
    if (!result.success) {
        alert("Error searching for trains. Please try again.");
        return;
    }
    
    const trainList = document.getElementById('trainList');
    trainList.innerHTML = '';
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('bookingForm').style.display = 'none';

    if (result.trains.length === 0) {
        trainList.innerHTML = '<li>No trains available for this route.</li>';
        return;
    }

    result.trains.forEach(train => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="train-details">
                <strong>${train.name} (${train.id})</strong><br>
                Dep: ${train.departure} | Seats: ${train.seats} | Fare: ₹${train.fare}<br>
                Status: ${train.status}
            </div>
            <button onclick="bookTrain(${train.id})">Book Now</button>
        `;
        trainList.appendChild(li);
    });
}

// Book train
async function bookTrain(trainId) {
    if (!currentUser) {
        alert("Please log in to book a ticket!");
        toggleProfile();
        return;
    }

    const response = await fetch('/book-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainId, user: currentUser })
    });
    
    const result = await response.json();
    
    if (!result.success) {
        alert("Error booking ticket. Please try again.");
        return;
    }
    
    currentBooking = result.booking;
    showBookingConfirmation();
}

// Show booking confirmation
function showBookingConfirmation() {
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('bookingConfirmation').style.display = 'block';

    let discountInfo = '';
    if (currentUser.role === 'student') {
        discountInfo = ' (15% student discount applied)';
    }

    document.getElementById('bookingTitle').textContent = `Booking Confirmed - ${currentBooking.train.name}`;
    document.getElementById('bookingDetails').innerHTML = `
        <p><strong>PNR:</strong> ${currentBooking.pnr}</p>
        <p><strong>Train:</strong> ${currentBooking.train.name} (${currentBooking.train.id})</p>
        <p><strong>Route:</strong> ${currentBooking.train.source} to ${currentBooking.train.destination}</p>
        <p><strong>Departure:</strong> ${currentBooking.train.departure}</p>
        <p><strong>Status:</strong> ${currentBooking.status}</p>
        <p><strong>Fare:</strong> ₹${currentBooking.finalFare}${discountInfo}</p>
        <p><strong>Passenger:</strong> ${currentUser.username} (${currentUser.role})</p>
    `;
}

// Process payment
async function processPayment() {
    const email = document.getElementById('email').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!email || !email.includes('@')) {
        alert("Please enter a valid email address!");
        return;
    }

    const bookingDetails = document.getElementById('bookingDetails').innerText;
    const paymentInfo = `Payment Method: ${paymentMethod}\nAmount: ₹${currentBooking.finalFare}`;
    const fullDetails = `${bookingDetails}\n${paymentInfo}`;

    const response = await fetch('/confirm-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            bookingDetails: fullDetails,
            bookingId: currentBooking.id
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        alert("Payment successful! Booking confirmation sent to your email.");
        backToSearch();
    } else {
        alert("Payment failed. Please try again.");
    }
}

// Go back to search
function backToSearch() {
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('bookingConfirmation').style.display = 'none';
}