require("dotenv").config();
let express = require("express");
let mongoose = require("mongoose");
let cors = require("cors");
let Contact = require("./contact.model.js");
let app = express();

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
    console.log(req.body);
    const { name, email,phone,service, message } = req?.body;
    if (!name || !email || !message || !phone || !service) {
      return res.json({ success: false, message: "Some field is empty" });
    }
    let contact = await Contact.create({ name, email,phone,service, message });
    console.log(contact);
    if (!contact) {
      return res.json({ success: false, message: "Some error occured" });
    }
    return res.json({ success: true, message: "Thanks for contacting us!" });
  } catch (error) {
    console.error(`Some error occured ${error}`);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
