const express = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const app = express();
const port = 8000;

dotenv.config();
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads folder created:", uploadsDir);
}

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost/pandemic")
  .then(() => console.log("Database is ready..!"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: false }));
let otpStorage = {};

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/login", (req, res) => {
  res.render("log-in");
});
app.get("/signup", (req, res) => {
  res.render("sign-up");
});
app.get("/firstPage", (req, res) => {
  res.render("firstPage");
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const otp = generateOTP();
  console.log("Generated OTP:", otp);
  otpStorage[email] = otp;

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res
      .status(400)
      .json({ error: "User already exists with this email" });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Registration OTP",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP for PIPH Login</title>
      <style>
          body {
              font-family: 'Arial', sans-serif;
              background-color: #1a1a1a;
              margin: 0;
              padding: 0;
              color: #e0e0e0;
              line-height: 1.6;
          }
          .container {
              width: 100%;
              max-width: 700px;
              margin: 20px auto;
              background-color:rgb(207, 199, 199);
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
          }
          .header {
              text-align: center;
              padding: 10px 15px;
              background: linear-gradient(135deg, #1f3a44, #0a2629); /* Dark gradient */
              border-bottom: 3px solid #00cccc; /* Cyan border retained */
          }
          .header img {
              max-width: 120px;
              height: auto;
              margin: 5px 0;
          }
          .header h1 {
              color: #00cccc; /* Cyan text for contrast */
              font-size: 24px;
              margin: 5px 0 0;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
          }
          .header p {
              color: #b0b0b0; /* Softer gray for subtitle */
              font-size: 14px;
              margin: 5px 0;
          }
          .banner img {
              width: 100%;
              height: auto;
              border-bottom: 2px solid #00cccc;
          }
          .content {
              padding: 20px;
              text-align: center;
          }
          .otp-box {
              font-size: 28px;
              font-weight: bold;
              color: #00cccc;
              background-color: #1a1a1a;
              padding: 12px 25px;
              display: inline-block;
              margin: 20px 0;
              border: 2px solid #00cccc;
              border-radius: 6px;
              box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
          }
          .features {
              margin: 25px 0;
              display: flex;
              justify-content: space-around;
              flex-wrap: wrap;
              padding: 0 20px;
          }
          .feature-item {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              flex: 1 1 30%;
              min-width: 200px;
          }
          .feature-item img {
              width: 28px;
              height: 28px;
              margin-right: 12px;
          }
          .footer {
              background-color: #333333;
              padding: 15px;
              text-align: center;
              font-size: 12px;
              color: #b0b0b0;
              border-top: 1px solid #00cccc;
          }
          a {
              color: #00cccc;
              text-decoration: none;
          }
          a:hover {
              text-decoration: underline;
              color: #00ffff;
          }
          h2 {
              color: #00cccc;
              margin: 15px 0;
              font-size: 24px;
          }
          p {
              margin: 10px 0;
          }
  
          /* Desktop Enhancements */
          @media only screen and (min-width: 601px) {
              .header {
                  padding: 15px 20px;
              }
              .header h1 {
                  font-size: 28px;
              }
              .header p {
                  font-size: 16px;
              }
              .content {
                  padding: 30px;
              }
              .otp-box {
                  font-size: 32px;
                  padding: 15px 30px;
              }
              .features {
                  padding: 0 30px;
              }
              .feature-item {
                  min-width: 180px;
              }
              .feature-item img {
                  width: 32px;
                  height: 32px;
              }
              h2 {
                  font-size: 26px;
              }
              p {
                  font-size: 16px;
              }
          }
  
          /* Mobile Optimization */
          @media only screen and (max-width: 600px) {
              .container {
                  margin: 10px;
                  border-radius: 6px;
                  max-width: 100%;
              }
              .header {
                  padding: 8px 10px;
              }
              .header img {
                  max-width: 100px;
              }
              .header h1 {
                  font-size: 20px;
              }
              .header p {
                  font-size: 12px;
              }
              .content {
                  padding: 15px;
              }
              .otp-box {
                  font-size: 22px;
                  padding: 10px 20px;
              }
              .features {
                  padding: 0 10px;
                  display: block;
              }
              .feature-item {
                  min-width: 100%;
                  margin-bottom: 12px;
              }
              .feature-item img {
                  width: 24px;
                  height: 24px;
              }
              .footer {
                  padding: 12px;
                  font-size: 10px;
              }
              h2 {
                  font-size: 20px;
              }
              p {
                  font-size: 14px !important;
              }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <!-- Header with Logo and Title -->
          <div class="header">
              <img src="piph.png" alt="PIPH Logo">
              <h1>PIPH</h1>
              <p>Pandemic Insights And Preparedness Hub</p>
          </div>
  
          <!-- Banner (Placeholder from Google) -->
          <!-- <div class="banner">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5zXU8qO8qV8qV8qV8qV8qV8qV8qV8qV8qV8qV8qV8qV8" alt="PIPH Banner">
          </div> -->
  
          <!-- Content -->
          <div class="content">
              <h2>Building Resilience, One Step at a Time</h2>
              <p style="font-size: 16px;">
                  Hello Buddy,<br>
                  Welcome to PIPH—your hub for pandemic insights and preparedness. We’re here to empower communities with cutting-edge tools and real-time data.
              </p>
              <p style="font-size: 16px;">
                  Your One-Time Password (OTP) to log in securely:
              </p>
              <div class="otp-box">${otp}</div>
              <p style="font-size: 14px; color: #b0b0b0;">
                  Valid for 10 minutes. Keep it confidential.
              </p>
  
              <!-- Features Section with Icons -->
              <div class="features">
                  <div class="feature-item">
                      <img src="https://img.icons8.com/ios-filled/50/00cccc/clock.png" alt="Real-Time Icon">
                      <span>Real-time pandemic tracking</span>
                  </div>
                  <div class="feature-item">
                      <img src="https://img.icons8.com/ios-filled/50/00cccc/settings.png" alt="Automation Icon">
                      <span>Automated resource management</span>
                  </div>
                  <div class="feature-item">
                      <img src="https://img.icons8.com/ios-filled/50/00cccc/shield.png" alt="Resilience Icon">
                      <span>Resilience-focused tools</span>
                  </div>
              </div>
  
              <p style="font-size: 16px;">
                  Stay connected:<br>
                  <a href="[INSERT INSTAGRAM URL HERE]" target="_blank">@PIPH_Official</a> | 
                  <a href="[INSERT WEBSITE URL HERE]" target="_blank">www.piph.com</a>
              </p>
          </div>
  
          <!-- Footer -->
          <div class="footer">
              <p>Best regards,<br><strong>Satyam Pandey</strong><br>CEO, PIPH</p>
              <p>© 2025 PIPH. All rights reserved.</p>
              <p>Need help? <a href="mailto:support@piph.com">support@piph.com</a></p>
          </div>
      </div>
  </body>
  </html>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending OTP email:", error);
      return res.status(500).json({ error: "Failed to send OTP" });
    }
    res.json({ message: "OTP sent! Please verify." });
  });
});
app.post("/register/verify", async (req, res) => {
  const { email, otp, password, name, phone, dob } = req.body;

  if (otpStorage[email] !== otp)
    return res.status(400).json({ error: "Invalid OTP" });

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ error: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    email,
    password: hashedPassword,
    name,
    phone,
    dob: new Date(dob),
    volunteerData: [],
  });
  await newUser.save();

  delete otpStorage[email];

  const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ message: "Registration successful", token });
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });

  bcrypt.compare(password, user.password, (err, result) => {
    if (err) return res.status(500).json({ error: "Internal error" });
    if (!result) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ message: "Login successful", token });
  });
});

// Forgot Password Routes
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });

    const otp = generateOTP();
    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      html: `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
          body { font-family: "Poppins", serif; background-color: #f9f9f9; margin: 0; padding: 0; }
          .email-container { width: 400px; margin: 20px auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
          .email-header { background-color: #4caf50; color: #ffffff; text-align: center; padding: 20px; }
          .email-header img { width: 150px; }
          .email-header h1 { margin: 10px 0 0; font-size: 24px; }
          .email-body { padding: 20px; text-align: center; }
          .email-body h2 { font-size: 20px; color: #333; }
          .email-body .otp-box { background-color: #f4f4f4; font-size: 24px; color: #4caf50; padding: 15px; margin: 20px auto; width: fit-content; border-radius: 5px; border: 1px solid #ddd; }
          .email-body p { font-size: 16px; color: #555; line-height: 1.6; }
          .email-footer { text-align: center; padding: 15px; font-size: 14px; color: #777; background-color: #f4f4f4; }
          .email-footer a { color: #4caf50; text-decoration: none; }
      </style>
  </head>
  <body>
      <div class="email-container">
          <div class="email-header">
              <img src="https://i.postimg.cc/pT69mFMB/logo.png" alt="Website Logo">
              <h1>Pandemic Response Hub</h1>
          </div>
          <div class="email-body">
              <h2>🔑 Password Reset</h2>
              <p>We received a request to reset your password. Use the OTP below to proceed:</p>
              <div class="otp-box">${otp}</div>
              <p><em>(This OTP is valid for the next 10 minutes.)</em></p>
              <p>If you didn’t request this, please ignore this email or <a href="#">contact support</a>.</p>
          </div>
          <div class="email-footer">
              <p>Need help? <a href="#">Visit our support page</a>.</p>
              <p>The <strong>PIPH Team</strong></p>
          </div>
      </div>
  </body>
  </html>`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error("Error sending OTP email:", error);
        return res.status(500).json({ error: "Failed to send OTP" });
      }
      res.json({ message: "OTP sent to your email" });
    });
  } catch (err) {
    console.error("Error in forgot-password:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

app.post("/reset-password/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.resetOtp !== otp || Date.now() > user.resetOtpExpiry) {
      return res.status(400).json({ valid: false });
    }
    res.json({ valid: true });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
});

app.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
