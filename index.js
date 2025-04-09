import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const uri = process.env.DB_URL;

app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Create a MongoClient
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

    /**
     * ************************************************************
     *                       API ENDPOINT START
     * ************************************************************
     */

    /**
     * ************************************************************
     *                       API ENDPOINT END
     * ************************************************************
     */
  } finally {
    await client.close();
  }
};

app.get("/", (req, res) => {
  res.status(200).send("Running.........");
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
run().catch((error) => console.log(error));
