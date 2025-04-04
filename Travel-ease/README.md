# TravelEase - Train Booking Application

A fully functional train booking web application with OTP verification and email notifications.

## Prerequisites
- Node.js (v14 or higher)
- Twilio account (for SMS OTP)
- Gmail account (for email notifications)

## Setup Instructions

1. **Clone the Repository or Create Directory**
   - Create a directory named `travel-ease` and place all files inside it as per the structure above.

2. **Install Dependencies**
   - Open a terminal in the `travel-ease` directory.
   - Run: `npm install`

3. **Configure Twilio**
   - Sign up at [Twilio](https://www.twilio.com/).
   - Get your `accountSid`, `authToken`, and a Twilio phone number.
   - Replace the placeholders in `index.js`:
     - `YOUR_TWILIO_SID`
     - `YOUR_TWILIO_AUTH_TOKEN`
     - `YOUR_TWILIO_PHONE_NUMBER`

4. **Configure Nodemailer (Gmail)**
   - Enable 2-factor authentication on your Google account.
   - Generate an [App Password](https://myaccount.google.com/apppasswords).
   - Replace the placeholders in `index.js`:
     - `your-email@gmail.com`
     - `your-app-specific-password`

5. **Add Images**
   - Place `Gemini_Generated_Image_swif67swif67swif.jpeg` (background) and `Gemini_Generated_Image_dsmh2hdsmh2hdsmh.jpeg` (logo) in the `public/` directory.
   - If you don't have these images, use placeholder URLs (e.g., `https://via.placeholder.com/70`) or skip them.

## Running the Application
1. **Start the Server**
   - In the `travel-ease` directory, run: `npm start`
   - The server will start at `http://localhost:3000`.

2. **Access the App**
   - Open a browser and go to `http://localhost:3000`.

## Features
- **Login**: OTP verification via SMS (Twilio).
- **Train Booking**: Search and book trains with student discounts.
- **Payment**: Simulated payment with email confirmation (Nodemailer).
- **Customer Support**: Contact info and placeholder live chat.

## Troubleshooting
- **OTP Not Sending**: Check Twilio credentials and phone number format (`+91XXXXXXXXXX`).
- **Email Not Sending**: Verify Gmail credentials and App Password.
- **Page Not Loading**: Ensure images are in `public/` or adjust paths in `index.html`.

## Notes
- Train data is hardcoded in `script.js` for simplicity. In a production app, move this to a database.
- Add error handling and security (e.g., HTTPS, input validation) for a real-world deployment.