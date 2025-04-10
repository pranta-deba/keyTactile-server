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
  const token = req?.headers?.authorization;
  // 1. Check if Authorization token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    // 2. Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    // 3. Attach decoded user to request object
    req.user = decoded;
    // 4. Move to the next middleware or route
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
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
    const orderCollection = db.collection("orders");

    //*! API ENDPOINT START
    //* Register
    app.post("/register", async (req, res) => {
      try {
        const { email, password, image, name, userName, phone } = req.body;
        // 1. Check if user exists
        const user = await userCollection.findOne({ email });

        if (user) {
          return res.status(401).json({
            success: false,
            message: "User Already Exists!",
            error: {},
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
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error,
        });
      }
    });

    //* Login
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        // 1. Check if user exists
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User not found!",
            error: {},
          });
        }

        // 2. Compare password with hashed one
        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: "Invalid password!",
            error: {},
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
          data: {
            id: user._id,
            email: user.email,
            name: user.name,
            image: user.image,
            userName: user.userName,
            role: user.role,
            phone: user.phone,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error,
        });
      }
    });

    //* Get All users
    app.get("/users", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      try {
        if (role !== "admin") {
          return res.status(401).json({
            success: false,
            message: "Unauthorized Access!",
            error: {},
          });
        }

        const { page = 1, limit = 10, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = {};
        // if search param exists, build a regex query
        if (search) {
          query = {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { userName: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          };
        }
        const total = await userCollection.countDocuments(query);
        const users = await userCollection
          .find(query, { projection: { password: 0 } })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        res.status(200).json({
          success: true,
          message: "Users Fetched Successfully.",
          data: users,
          meta: {
            totalItems: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            pageSize: parseInt(limit),
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error,
        });
      }
    });

    //* Get All Products
    app.get("/products", async (req, res) => {
      try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = {};
        // if search param exists, build a regex query
        if (search) {
          query = {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { brand: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          };
        }
        const total = await productCollection.countDocuments(query);
        const products = await productCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        res.status(200).json({
          success: true,
          message: "Products Fetched Successfully.",
          data: products,
          meta: {
            totalItems: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            pageSize: parseInt(limit),
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error,
        });
      }
    });

    //* Create Product
    app.post("/products", async (req, res) => {
      try {
        const result = await productCollection.insertOne(req.body);
        res.status(200).json({
          success: true,
          message: "Product Created Successfully.",
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error,
        });
      }
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
