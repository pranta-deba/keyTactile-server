import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 3000;
const { DB_URL, JWT_SECRET, JWT_EXPIRES } = process.env;

//*! Create a MongoClient
const client = new MongoClient(DB_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//*! MIDDLEWARES
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

const auth = (req, res, next) => {
  next();
};

const run = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const db = client.db("key-tactile");
    const productCollection = db.collection("products");
    const userCollection = db.collection("users");

    //*! API ENDPOINT START
    //* Register
    app.post("/register", async (req, res) => {
      const { email, password, image, name, userName, phone } = req.body;
      // 1. Check if user exists
      const user = await userCollection.findOne({ email });

      if (user) {
        return res.status(401).json({
          success: false,
          message: "User Already Exists!",
        });
      }
      // 1. Password Hashing
      const hashPassword = bcrypt.hashSync(password, 10);

      const result = await userCollection.insertOne({
        email,
        password: hashPassword,
        image,
        name,
        userName,
        role: "user",
        phone,
      });

      res.status(200).json({
        success: true,
        message: "User Created Successfully.",
        data: result,
      });
    });

    //* Login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      // 1. Check if user exists
      const user = await userCollection.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found!",
        });
      }

      // 2. Compare password with hashed one
      const isMatch = bcrypt.compareSync(password, user.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid password!",
        });
      }

      // 3. Create JWT token
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );

      res.status(200).json({
        success: true,
        message: "Login successful!",
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
          userName: user.userName,
          role: user.role,
          phone: user.phone,
        },
      });
    });

    //* Get All Products
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.status(200).json({
        success: true,
        message: "Product Fetched Successfully.",
        data: result,
      });
    });

    //* Create Product
    app.post("/products", async (req, res) => {
      const result = await productCollection.insertOne(req.body);
      res.status(200).json({
        success: true,
        message: "Product Created Successfully.",
        data: result,
      });
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
