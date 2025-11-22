require("dotenv").config();
let express = require("express");
let mongoose = require("mongoose");
let cors = require("cors");
let Contact = require("./contact.model.js");
let app = express();
const Sib = require("@sendinblue/client");

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
      "https://webinosolutions.com",
    ],
    methods: ["POST"],
    // credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
// Initialize API client
const brevoClient = new Sib.TransactionalEmailsApi();
brevoClient.setApiKey(
  Sib.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Simple escape function
const escapeHTML = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

app.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;

    // --- VALIDATIONS ---
    if (!name || !email || !phone || !service || !message) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone" });
    }

    // --- ESCAPED DATA ---
    const safe = {
      name: escapeHTML(name),
      email: escapeHTML(email),
      phone: escapeHTML(phone),
      service: escapeHTML(service),
      message: escapeHTML(message),
    };

    // --- SAVE TO DB ---
    const contact = await Contact.create(safe);

    const sentAt = new Date(contact.createdAt).toLocaleString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // --- HTML EMAIL BODY ---
    const html = `
      <h2>Client ki nayi query hai, fatafat check kar</h2>
      <p><strong>Name:</strong> ${safe.name}</p>
      <p><strong>Email:</strong> ${safe.email}</p>
      <p><strong>Phone:</strong> ${safe.phone}</p>
      <p><strong>Service:</strong> ${safe.service}</p>
      <p><strong>Message:</strong> ${safe.message}</p>
      <hr>
      <p>Sent At: ${sentAt}</p>
    `;

    // --- SEND EMAIL via BREVO API (@sendinblue/client) ---
    await brevoClient.sendTransacEmail({
      sender: {
        email: process.env.SENDER_MAIL,
        name: "Webino",
      },
      to: [{ email: process.env.RECEIVER_MAIL }],
      replyTo: { email: safe.email },
      subject: "New Service Query",
      htmlContent: html,
    });

    return res.status(200).json({
      success: true,
      message: "Thanks for contacting us!",
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
