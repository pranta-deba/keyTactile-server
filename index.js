import express from "express";
import dotenv from "dotenv";
import cors from "cors";
const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).send("Running.........");
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
