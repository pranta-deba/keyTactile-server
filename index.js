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

    const db = client.db("key-tactile");
    const productCollection = db.collection("products");

    //*! API ENDPOINT START
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.json(result);
    });

    app.post("/products", async (req, res) => {
      const result = await productCollection.insertOne(req.body);
      res.json(result);
    });

    //*! API ENDPOINT END
  } finally {
    // await client.close();
  }
};

//*! ROOT Route
app.get("/", (req, res) => {
  res.status(200).send("Running.........");
});

//*! APP Listen
app.listen(PORT, () => {
  run().catch((error) => console.log(error));
  console.log(`🚀 Server listening on port ${PORT}`);
});
