# KeyTactile - Keyboard Management E-commerce Backend

This is the backend API for KeyTactile, an e-commerce platform dedicated to mechanical keyboards and accessories. It provides the necessary endpoints for user authentication, product management, order processing, and brand administration.

## Technologies Used

* Node.js
* Express
* MongoDB
* jsonwebtoken
* bcryptjs
* cors
* dotenv

## Frontend URL : [here](https://key-tactile-client.vercel.app/)


## API Endpoints
### Auth

* **`POST /register`**: Register a new user.
* **`PATCH /update-profile/:email`**: Update an existing user's profile. (Admin Token Required)
* **`POST /login`**: Log in an existing user.

### Products

* **`POST /products`**: Create a new product. (Admin Token Required)
* **`GET /products`**: Get all products.
* **`PUT /products/:id`**: Update an existing product. (Admin Token Required)
* **`PATCH /products/:id/quantity`**: Update the quantity of a product (decrease). (Admin Token Required)
* **`PATCH /products/:id/quantity?quantity=:value`**: Increase the quantity of a product by a specific value. (Admin Token Required)
* **`GET /products/:id`**: Get a single product by ID. (Admin Token Required)
* **`DELETE /products/:id`**: Delete a product. (Admin Token Required)

### Users

* **`GET /users`**: Get all users. (Admin Token Required)

### Orders

* **`POST /orders`**: Create a new order. (User Token Required)
* **`GET /orders`**: Get all orders. (Admin Token Required)
* **`PATCH /orders/:id/status`**: Update the status of an order. (Admin Token Required)

### Brands

* **`POST /brands`**: Create a new brand. (Admin Token Required)
* **`PATCH /brands/:id`**: Update an existing brand. (Admin Token Required)
* **`GET /brands/:id`**: Get a single brand by ID. (Admin Token Required)
* **`DELETE /brands/:id`**: Delete a brand. (Admin Token Required)
* **`GET /brands`**: Get all brands. (Admin Token Required)

### Admin

* **`GET /stat`**: Get overall statistics. (Admin Token Required)

## Environment Variables

* `MONGODB_URI`
* `JWT_SECRET`

## Getting Started

1.  Clone the repository.
2.  Install dependencies (`npm install`).
3.  Create `.env` and configure variables.
4.  Start the server (`npm start`).
