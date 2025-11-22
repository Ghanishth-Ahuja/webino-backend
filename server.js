require("dotenv").config();
let express = require("express");
let mongoose = require("mongoose");
let cors = require("cors");
let Contact = require("./contact.model.js");
let app = express();
const nodemailer = require("nodemailer");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(`connected to db`);
  })
  .catch((err) => {
    console.error(`Some error occured while connecting to db ${err}`);
  });

app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://webinosolutions.com",
    ],
    methods: ["POST"],
    // credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;

    // Basic validations
    if (!name || !email || !message || !phone || !service) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Basic safe regex checks (not strict)
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    // Escape HTML (prevents HTML breaking in email)
    const safe = (str) =>
      String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const safeName = safe(name);
    const safeEmail = safe(email);
    const safePhone = safe(phone);
    const safeService = safe(service);
    const safeMessage = safe(message);

    // Store in DB
    const contact = await Contact.create({
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      service: safeService,
      message: safeMessage,
    });

    if (!contact) {
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    const formattedTime = new Date(contact.createdAt).toLocaleString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Construct email body (use HTML field)
    const htmlBody = `
      <h2>Naya data aya hai user ka, fatafat check kar le</h2>

      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <p><strong>Service:</strong> ${safeService}</p>
      <p><strong>Message:</strong><br>${safeMessage}</p>

      <hr>

      <p>Sent at: ${formattedTime}</p>
    `;
    const mailOptions = {
      from: process.env.SENDER_MAIL,
      to: process.env.RECEIVER_MAIL,
      subject: "New Service Query",
      html: htmlBody,
      replyTo: safeEmail,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thanks for contacting us!",
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
