import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
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
    origin: "http://localhost:5173",
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
    const brandCollection = db.collection("brands");

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

        if (result.acknowledged && result.insertedId) {
          // 3. Create JWT token
          const token = jwt.sign(
            {
              id: result.insertedId,
              name: name,
              email: email,
              role: "user",
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
          );

          res.status(200).json({
            success: true,
            message: "User Created Successfully.",
            token,
            data: {
              _id: result.insertedId,
              email,
              image,
              name,
              userName,
              phone,
              role: "user",
            },
          });
        }
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
            name: user.name,
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
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }
      try {
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
          .sort({ _id: -1 })
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

    //* Create Brands
    app.post("/brands", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }
      try {
        const result = await brandCollection.insertOne(req.body);

        if (result?.acknowledged && result?.insertedId) {
          const newData = { _id: result.insertedId, ...req.body };
          res.status(200).json({
            success: true,
            message: "Brands Created Successfully.",
            data: newData,
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong!",
          error,
        });
      }
    });

    //* Get All Brands
    app.get("/brands", async (req, res) => {
      try {
        const { page = 1, limit, search } = req.query;

        let query = {};
        if (search) {
          query = {
            $or: [{ brand: { $regex: search, $options: "i" } }],
          };
        }

        const total = await brandCollection.countDocuments(query);

        let resultQuery = brandCollection.find(query).sort({ _id: -1 });

        if (limit) {
          const parsedLimit = parseInt(limit);
          const skip = (parseInt(page) - 1) * parsedLimit;
          resultQuery = resultQuery.skip(skip).limit(parsedLimit);
        }

        const result = await resultQuery.toArray();

        res.status(200).json({
          success: true,
          message: "Get All Brands Successfully.",
          data: result,
          meta: {
            totalItems: total,
            currentPage: limit ? parseInt(page) : 1,
            totalPages: limit ? Math.ceil(total / parseInt(limit)) : 1,
            pageSize: limit ? parseInt(limit) : total,
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

    //* Get Single Brand
    app.get("/brands/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const product = await brandCollection.findOne({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          success: true,
          message: "Brand Fetched successfully.",
          data: product,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while fetching brand.",
          error: error,
        });
      }
    });

    // * Update Brand
    app.patch("/brands/:id", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }

      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }

      const { id } = req.params;
      const { brand, country, founded, description, image } = req.body;

      const updateFields = {};
      if (brand) updateFields.brand = brand;
      if (country) updateFields.country = country;
      if (founded) updateFields.founded = founded;
      if (description) updateFields.description = description;
      if (image) updateFields.image = image;

      try {
        const result = await brandCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Brand not found.",
            error: {},
          });
        }

        res.status(200).json({
          success: true,
          message: "Brand updated successfully.",
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while updating the brand.",
          error: error,
        });
      }
    });

    //* Delete Brand
    app.delete("/brands/:id", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }
      const { id } = req.params;
      try {
        const result = await brandCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result?.acknowledged && result?.deletedCount === 1) {
          res.status(200).json({
            success: true,
            message: "Brand Deleted successfully.",
            data: result,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Brand Not Found.",
            error: {},
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while delete brand.",
          error: error,
        });
      }
    });

    //* Create Product
    app.post("/products", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }
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

    //* Get All Products
    app.get("/products", async (req, res) => {
      try {
        const { page = 1, limit = 10, search, sort } = req.query;
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
        // Default sort by _id (latest first)
        let sortOption = { _id: -1 };
        // Sort by price
        if (sort === "price-asc") {
          sortOption = { price: 1 };
        } else if (sort === "price-desc") {
          sortOption = { price: -1 };
        }

        const total = await productCollection.countDocuments(query);
        const products = await productCollection
          .find(query)
          .sort(sortOption)
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

    //* Get Single Product
    app.get("/products/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const product = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          success: true,
          message: "Product Fetched successfully.",
          data: product,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while fetching product.",
          error: error,
        });
      }
    });

    //* Update Product
    app.put("/products/:id", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }

      const { id } = req.params;
      const {
        title,
        brand,
        availableQuantity,
        price,
        rating,
        description,
        images,
      } = req.body;

      try {
        // Check if the product exists
        const product = await productCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found!",
          });
        }

        // Prepare the update data
        const updatedData = {};
        if (title) updatedData.title = title;
        if (brand) updatedData.brand = brand;
        if (availableQuantity)
          updatedData.availableQuantity = availableQuantity;
        if (price) updatedData.price = price;
        if (rating) updatedData.rating = rating;
        if (description) updatedData.description = description;
        if (images) updatedData.images = images;

        // Update the product
        const result = await productCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        // Check if the product was updated
        if (result.modifiedCount === 0) {
          return res.status(400).json({
            success: false,
            message: "No fields were updated. Please provide valid data.",
          });
        }

        // Fetch the updated product
        const updatedProduct = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          success: true,
          message: "Product updated successfully.",
          data: updatedProduct,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while updating the product.",
          error: error,
        });
      }
    });

    //* Update Product Quantity
    app.patch("/products/:id/quantity", async (req, res) => {
      const { id } = req.params;
      const { action } = req.body;
      const { quantity } = req.query;

      try {
        const objectId = new ObjectId(id);
        const product = await productCollection.findOne({ _id: objectId });

        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found.",
          });
        }

        let update = {};

        if (
          !quantity &&
          action === "decrease" &&
          product.availableQuantity > 0
        ) {
          update = { $inc: { availableQuantity: -1 } };
        } else if (!quantity && action === "increase") {
          update = { $inc: { availableQuantity: 1 } };
        } else if (quantity && action === "increase-by-value") {
          const increaseValue = parseInt(quantity);
          if (isNaN(increaseValue) || increaseValue <= 0) {
            return res.status(400).json({
              success: false,
              message: "Quantity must be a positive integer.",
            });
          }
          update = { $inc: { availableQuantity: increaseValue } };
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid action or quantity.",
          });
        }

        const result = await productCollection.findOneAndUpdate(
          { _id: objectId },
          update,
          { returnDocument: "after" }
        );

        res.status(200).json({
          success: true,
          message: "Product quantity updated successfully.",
          data: result.value,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while updating the product quantity.",
          error: error.message,
        });
      }
    });

    //* Delete Product
    app.delete("/products/:id", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }
      const { id } = req.params;

      try {
        const result = await productCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result?.acknowledged && result?.deletedCount === 1) {
          res.status(200).json({
            success: true,
            message: "Product Deleted successfully.",
            data: result,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Product Not Found.",
            error: {},
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while delete product.",
          error: error,
        });
      }
    });

    //* Create Order
    app.post("/orders", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role, name, email } = req.user;
      if (role !== "user") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }

      const { phone, address, cartItems, totalAmount } = req.body;

      try {
        if (!phone || !address) {
          return res.status(400).json({
            success: false,
            message: "All fields (phone, address) are required.",
          });
        }

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Cart is empty. Cannot place order.",
          });
        }

        // Check stock and update product quantities
        for (const item of cartItems) {
          const product = await productCollection.findOne({
            _id: new ObjectId(item.productId),
          });

          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product not found for ID: ${item.productId}`,
            });
          }

          if (product.availableQuantity < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Not enough quantity for product: ${product.title}`,
            });
          }

          // Update product quantity
          await productCollection.updateOne(
            { _id: new ObjectId(item.productId) },
            { $inc: { availableQuantity: -item.quantity } }
          );
        }
        // Prepare order object
        const newOrder = {
          name,
          email,
          phone,
          address,
          cartItems: cartItems || [],
          totalAmount: totalAmount || 0,
          orderDate: new Date(),
          status: "pending",
        };
        // Insert into order collection
        const result = await orderCollection.insertOne(newOrder);

        res.status(201).json({
          success: true,
          message: "Order placed successfully!",
          data: {
            _id: result.insertedId,
            ...newOrder,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while placing the order.",
          error: error,
        });
      }
    });

    //* Get All Orders
    app.get("/orders", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role, email } = req.user;
      try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = {};
        // if search param exists, build a regex query
        if (search) {
          query = {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
              { address: { $regex: search, $options: "i" } },
            ],
          };
        }
        // User can only see their own orders
        if (role === "user") {
          query.email = email;
        }

        const total = await orderCollection.countDocuments(query);

        const orders = await orderCollection
          .find(query)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        res.status(200).json({
          success: true,
          message: "Orders Fetched Successfully.",
          data: orders,
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

    //* Update Status By Admin
    app.patch("/orders/:id/status", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }
      const orderId = req.params.id;
      const { newStatus } = req.body;

      if (!newStatus) {
        return res.status(400).json({
          success: false,
          message: "New status is required.",
        });
      }

      try {
        const result = await orderCollection.updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { status: newStatus } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found or status already updated.",
          });
        }

        res.json({
          success: true,
          message: "Order status updated successfully.",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while updating the order status.",
          error: error,
        });
      }
    });

    //* Delete Order
    app.delete("/orders/:id", async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID.",
        });
      }

      try {
        const result = await orderCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found.",
          });
        }

        res.status(200).json({
          success: true,
          message: "Order deleted successfully.",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Something went wrong while deleting the order.",
          error,
        });
      }
    });

    //*  Admin Get Stats
    app.get("/stat", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      const { role } = req.user;
      if (role !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized Access!",
          error: {},
        });
      }

      try {
        const orderStats = await orderCollection
          .aggregate([
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
              },
            },
          ])
          .toArray();

        let totalOrders = 0;
        let newOrders = 0;
        let totalEarnings = 0;

        orderStats.forEach((stat) => {
          totalOrders += stat.count;
          if (stat._id === "pending") {
            newOrders = stat.count;
          }
          totalEarnings += stat.totalAmount;
        });

        // Aggregating product and user counts
        const [productCountResult, userCountResult] = await Promise.all([
          productCollection.estimatedDocumentCount(),
          userCollection.estimatedDocumentCount(),
        ]);

        res.send({
          success: true,
          data: {
            totalProducts: productCountResult,
            totalUsers: userCountResult,
            totalOrders,
            newOrders,
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          },
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Something went wrong",
          error: err,
        });
      }
    });

    //* Update Profile
    app.patch("/update-profile/:email", auth, async (req, res) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
          error: {},
        });
      }
      try {
        const { email } = req.params;
        const { name, userName, phone, image } = req.body;

        const updatedData = {
          ...(name && { name }),
          ...(userName && { userName }),
          ...(phone && { phone }),
          ...(image && { image }),
        };

        const result = await userCollection.updateOne(
          { email },
          { $set: updatedData }
        );

        if (result.modifiedCount > 0) {
          const updatedUser = await userCollection.findOne(
            { email },
            { projection: { password: 0 } }
          );

          res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "User not found or no changes made",
          });
        }
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
