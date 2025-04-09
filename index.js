import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";

const PORT = process.env.PORT || 3000;
const app = express();
const uri = process.env.DB_URL;

//*! MIDDLEWARES
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

//*! Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    //*! API ENDPOINT START

    //*! API ENDPOINT END
  } finally {
    await client.close();
  }
};

const connectDB = async () => {
  try {
    await client.connect();
    const db = client.db("key-tactile");
    console.log("✅ Connected to MongoDB!");

    const productCollection = db.collection("products");
    
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
  }
};

//*! ROOT Route
app.get("/", (req, res) => {
  res.status(200).send("Running.........");
});

//*! APP Listen
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

//*! DB Run
run().catch((error) => console.log(error));
