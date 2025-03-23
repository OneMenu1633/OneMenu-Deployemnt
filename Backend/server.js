const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const nodemailer = require('nodemailer'); // To Send OTP
const crypto = require('crypto'); // To generate OTP
const bcrypt = require('bcrypt'); // To hash passwordsconst razorpay = require('razorpay');
const razorpay = require('razorpay');
const axios = require("axios");

const authRouter = require('./routes/authRoutes.js');// Adjust the path as necessary
const userRouter = require('./routes/userRoutes.js');
const Fooditems = require('./models/Fooditems.js');  
const FrankiesRolls = require('./models/FrankiesRolls.js');
const FreshJuice = require('./models/FreshJuice.js');
const AnnaDishes = require('./models/AnnaDishes.js');
const itemsRoutes = require('./routes/itemRoutes.js'); 
const Order = require('./models/Order'); // Import the Order model
const analysisController = require('./controllers/analysisController'); // Import the analysis controller
const WebSocket = require("ws");
const transporter = require('./Config/nodemailer.js');
const http = require("http");



// Load environment variables
require('dotenv').config();

const instance = new razorpay({
  key_id: 'YOUR_KEY_ID',
  key_secret: 'YOUR_KEY_SECRET',
});

instance.orders.create({ amount: 50000, currency: 'INR', receipt: 'order_rcptid_11' }, function (err, order) {
  console.log(order);
});

const app = express();
const PORT = process.env.PORT || 5000;
    
// // MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI;
const allowedOrigin = ['http://localhost:5173', 'http://localhost:5174', 'https://onemenu-admin.netlify.app', 'https://onemenu.netlify.app', 'https://onemenubyit.netlify.app', 'https://onemenuadmin.netlify.app'];

// Middleware
app.use(cors({
  origin: allowedOrigin ,  // Allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully 🚀'))
    .catch(error => console.error('MongoDB connection error:', error));

    
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! WebSocket server for Auto refresh in admin
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send existing orders to the client
  Order.find({ paymentStatus: "Success" })
    .then((orders) => {
      ws.send(JSON.stringify({ type: "INITIAL_ORDERS", data: orders }));
    })
    .catch((err) => {
      console.error("Error fetching orders:", err);
    });

  // Listen for new orders in the database
  const orderChangeStream = Order.watch();

  orderChangeStream.on("change", (change) => {
    if (change.operationType === "insert") {
      const newOrder = change.fullDocument;
      ws.send(JSON.stringify({ type: "NEW_ORDER", data: newOrder }));
    }
  });

  // Clean up on client disconnect
  ws.on("close", () => {
    console.log("Client disconnected");
    orderChangeStream.close();
  });
});

console.log("WebSocket server is running on ws://localhost:8080");


// // Create an HTTP server
// const server = http.createServer();

// // Create a WebSocket server attached to the HTTP server
// const wss = new WebSocket.Server({ server });

// wss.on("connection", (ws) => {
//   console.log("Client connected");

//   // Send existing orders to the client
//   Order.find({ paymentStatus: "Success" })
//     .then((orders) => {
//       ws.send(JSON.stringify({ type: "INITIAL_ORDERS", data: orders }));
//     })
//     .catch((err) => {
//       console.error("Error fetching orders:", err);
//     });

//   // Listen for new orders in the database
//   const orderChangeStream = Order.watch();

//   orderChangeStream.on("change", (change) => {
//     if (change.operationType === "insert") {
//       const newOrder = change.fullDocument;
//       ws.send(JSON.stringify({ type: "NEW_ORDER", data: newOrder }));
//     }
//   });

//   // Handle WebSocket errors
//   ws.on("error", (error) => {
//     console.error("WebSocket error:", error);
//   });

//   // Clean up on client disconnect
//   ws.on("close", () => {
//     console.log("Client disconnected");
//     orderChangeStream.close();
//   });
// });

// // Start the server on port 10000 (Render's default port)
// server.listen(5000, () => {
//   console.log("WebSocket server is running on wss://onemenu-deployment-musk.onrender.com");
// });
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!Email For Updated order Status
async function updateOrderStatusInDatabase(orderId, status) {
  // Update order in the database
  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    { orderStatus: status },
    { new: true }
  );

  if (!updatedOrder) {
    throw new Error('Order not found');
  }

  return updatedOrder;
}

// PUT /api/order/:orderId - Update order status
app.put('/api/order/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    // Update the order status in the database
    const updatedOrder = await updateOrderStatusInDatabase(orderId, status);

    // Generate email content with order details
    const emailSubject = `Your Order Status Has Been Updated`;
    const emailHtml = generateOrderEmailContent(updatedOrder, status);

    // Send an email to the user
    await sendEmail(updatedOrder.customer.email, emailSubject, emailHtml);

    res.status(200).json({ message: 'Order status updated successfully', updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Function to generate email content with order details
const generateOrderEmailContent = (order, status) => {
  const orderDate = new Date(order.date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const itemsList = order.items
    .map(
      (item) => `
      <tr>
        <td>${item.title}</td>
        <td>₹${item.price}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price * item.quantity}</td>
      </tr>
    `
    )
    .join("");

  return `
<html>
  <head>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        background-color: #f8f9fa;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background-color: #DDE6FE; /* Light blue for header */
        color: #333333; /* Dark text for contrast */
        text-align: center;
        padding: 20px;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: bold;
      }
      .email-body {
        padding: 20px;
        color: #333333;
      }
      .order-details {
        margin-bottom: 20px;
      }
      .order-details h2 {
        font-size: 20px;
        margin-bottom: 10px;
        color: #6C63FF; /* Accent color for headings */
      }
      .order-details p {
        margin: 5px 0;
        color: #555555;
      }
      .order-items {
        margin-bottom: 20px;
      }
      .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #eeeeee;
      }
      .order-item:last-child {
        border-bottom: none;
      }
      .order-item .item-name {
        font-weight: bold;
        color: #333333;
      }
      .order-item .item-price {
        color: #777777;
      }
      .order-item .item-quantity {
        color: #777777;
      }
      .order-total {
        font-size: 18px;
        font-weight: bold;
        text-align: right;
        margin-top: 20px;
        color: #6C63FF; /* Accent color for total amount */
      }
      .email-footer {
        text-align: center;
        padding: 20px;
        background-color: #FAF5FF; /* Light purple for footer */
        color: #777777;
        font-size: 14px;
      }
      .email-footer a {
        color: #6C63FF; /* Accent color for links */
        text-decoration: none;
      }
      .email-footer a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1>Your Order Status Has Been Updated</h1>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p>Hi ${order.customer.name},</p>
        <p>Your order (ID: ${order.orderId}) status has been updated to: <strong>${status}</strong>.</p>

        <div class="order-details">
          <h2>Order Details</h2>
          <p><strong>Order Placed On:</strong> ${new Date(order.date).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}</p>
        </div>

        <!-- Order Items -->
        <div class="order-items">
          ${order.items
            .map(
              (item) => `
            <div class="order-item">
              <div class="item-name">${item.title}</div>
              <div class="item-price">₹${item.price} x ${item.quantity}</div>
              <div class="item-total">₹${item.price * item.quantity}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Order Total -->
        <div class="order-total">
          Total Amount: ₹${order.totalAmount}
        </div>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>
          Thank you for ordering with <strong>OneMenu</strong>! We hope you enjoy your meal. 🍔🍕
        </p>
        <p>
          If you have any questions, feel free to <a href="mailto:onemenu.it@gmail.com">contact us</a>.
        </p>
      </div>
    </div>
  </body>
</html>
  `;
};

// Function to send email
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html, // Use HTML for rich content
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "SUBSCRIBE_ORDER") {
      // Subscribe the client to updates for a specific order
      ws.orderId = data.orderId;
    }
  });

  // Simulate order status updates (replace with your actual logic)
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.orderId) {
        const status = ["Pending", "Ready", "Delivered"][Math.floor(Math.random() * 3)];
        client.send(JSON.stringify({ type: "ORDER_STATUS_UPDATE", orderId: client.orderId, status }));
      }
    });
  }, 5000); // Send updates every 5 seconds
});


// Routes
app.get('/analysis', analysisController.getAnalysis); // Use the getAnalysis function

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Route: Fetch Products from Multiple Collections
app.get('/api/products/:menuType', async (req, res) => {
    const { menuType } = req.params;
  
    try {
        // Dynamically select the collection model based on the menuType
        let collection;
        if (menuType === 'fooditems') {
          collection = Fooditems;
        } else if (menuType === 'frankies_Rolls') {
          collection = FrankiesRolls;
        } else if (menuType === 'FreshJuice') {
          collection = FreshJuice;
        } else if (menuType === 'AnnaDishes') {
          collection = AnnaDishes;
        } else {
          return res.status(400).json({ message: 'Invalid menu type.' });
        }

      const products = await collection.find();
      res.status(200).json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  });

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Route: Get all menus
app.get('/products/menu', async (req, res) => {
  try {
    const foodItems = await Fooditems.find();
    const frankiesRolls = await FrankiesRolls.find();
    const annaDishes = await AnnaDishes.find();
    const freshJuice = await FreshJuice.find();

    const menus = {
      foodItems,
      frankiesRolls,
      annaDishes,
      freshJuice,
    };

    res.status(200).json(menus);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ message: 'Server error while fetching menus' });
  }
});


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Dashboard
app.get('/', (req, res)=> res.send("App Working"));
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! POST endpoint for adding an order
app.post('/api/order', async (req, res) => {
  try {
    const newOrder = new Order({
      orderId: req.body.orderId,
      items: req.body.items,
      customer: req.body.customer,
      paymentStatus: req.body.paymentStatus,
      orderStatus: req.body.orderStatus,
      totalAmount: req.body.totalAmount,
      orderStatus: 'Pending',  // Default status
      date: new Date(),
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error adding order:', error);
    res.status(500).json({ message: 'Failed to add order' });
  }
});


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! GET route to fetch all orders
app.get('/api/order', (req, res) => {
  Order.find()
    .sort({ date: -1 }) // Sort by date in descending order
    .then(orders => {
      res.json(orders); // Return the orders as JSON
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Failed to fetch orders', error });
    });
});


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Route setup with /api prefix for Edit Item
app.put('/api/products/update/:stall/:id', async (req, res) => {
  const { stall, id } = req.params; // `stall` will tell which model to use
  const { title, price, name, rating } = req.body;

  // Check if the id is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  try {
    let Model;
    
    // Dynamically choose the model based on the `stall` parameter
    switch (stall) {
      case 'foodItems':
        Model = Fooditems;
        break;
      case 'frankiesRolls':
        Model = FrankiesRolls;
        break;
      case 'annaDishes':
        Model = AnnaDishes;
        break;
      case 'freshJuice':
        Model = FreshJuice;
        break;
      default:
        return res.status(400).json({ message: 'Invalid stall type' });
    }

    // Find and update the product by ObjectId
    const updatedProduct = await Model.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating product", error });
  }
});


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Delete product by ID
app.delete("/api/products/delete/:stall/:id", async (req, res) => {
  try {
    const { stall, id } = req.params;

    // Validate the ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Dynamically choose the model based on the `stall` parameter
    let Model;

    switch (stall) {
      case 'foodItems':
        Model = Fooditems;
        break;
      case 'frankiesRolls':
        Model = FrankiesRolls;
        break;
      case 'annaDishes':
        Model = AnnaDishes;
        break;
      case 'freshJuice':
        Model = FreshJuice;
        break;
      default:
        return res.status(400).json({ error: "Invalid stall type" });
    }

    // Find and delete the product by ID in the selected model
    const product = await Model.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Log success
    console.log("Deleted product:", product);

    // Send response
    res.status(200).json({ message: "Product deleted successfully", product });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.put('/api/products/toggle-availability/:stall/:id', async (req, res) => {
  const { stall, id } = req.params;

  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  try {
    let Model;

    // Dynamically choose the model based on the `stall` parameter
    switch (stall) {
      case 'foodItems':
        Model = Fooditems;
        break;
      case 'frankiesRolls':
        Model = FrankiesRolls;
        break;
      case 'annaDishes':
        Model = AnnaDishes;
        break;
      case 'freshJuice':
        Model = FreshJuice;
        break;
      default:
        return res.status(400).json({ message: 'Invalid stall type' });
    }

    // Find the product by ID
    const product = await Model.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Toggle the isAvailable status
    product.isAvailable = !product.isAvailable;

    // Save the updated product
    const updatedProduct = await product.save();

    res.json({ success: true, updatedProduct });
  } catch (error) {
    console.error('Error toggling product availability:', error);
    res.status(500).json({ message: 'Error toggling product availability', error });
  }
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! PUT route to update the order status of an order
app.put('/api/order/:orderId', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  console.log("Received request to update order:", orderId, "with status:", status);

  Order.findByIdAndUpdate(orderId, { orderStatus: status }, { new: true })
    .then(updatedOrder => {
      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
      console.log("Updated Order:", updatedOrder); // Log the updated order
      res.status(200).json(updatedOrder); // Return the updated order
    })
    .catch((error) => {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: 'Failed to update order status', error });
    });
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! GET /api/order/:orderId/status
app.get('/api/order/:orderId/status', async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findOne({ orderId }, { orderStatus: 1 }); // Fetch only the orderStatus field
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ orderStatus: order.orderStatus });
  } catch (error) {
    console.error("Error fetching order status:", error);
    res.status(500).json({ message: 'Failed to fetch order status' });
  }
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Add Item
app.use('/api', itemsRoutes);

// server.js or app.js (your backend file)
const twilio = require("twilio");

app.use(express.json());

const accountSid = 'ACaa50878dc9c29af495c3b329a8ad4b21';
const authToken = '[AuthToken]';
const client = require('twilio')(accountSid, authToken);


const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    const response = await axios.post(
      "https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages",
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer YOUR_ACCESS_TOKEN`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Meta WhatsApp Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Meta WhatsApp Error:", error.response.data);
  }
};


// API route to send SMS
app.post('/api/send-whatsapp', (req, res) => {
  const { phoneNumber, message } = req.body;

  console.log("Received WhatsApp request:", phoneNumber, message);

  sendWhatsAppMessage(phoneNumber, message)
    .then(() => {
      console.log("WhatsApp message sent successfully!");
      res.status(200).send("WhatsApp message sent");
    })
    .catch((error) => {
      console.error("Error sending WhatsApp message:", error);
      res.status(500).send("Failed to send WhatsApp message");
    });
});

app.get("/api/products/:collection/:id", async (req, res) => {
  const collectionName = req.params.collection; // Get the collection name from the URL
  const productId = req.params.id; // Get the product ID from the URL

  // List of allowed collections to prevent unauthorized access
  const allowedCollections = ["fooditems", "FreshJuice", "AnnaDishes", "frankies_Rolls"];

  // Check if the requested collection is allowed
  if (!allowedCollections.includes(collectionName)) {
    return res.status(400).json({ error: "Invalid collection name" });
  }

  try {
    const db = mongoose.connection.db; // Access the database
    const product = await db.collection(collectionName).findOne({ _id: new mongoose.Types.ObjectId(productId) });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product); // Return the product details
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.get('/api/search', async (req, res) => {
//   const query = req.query.q;

//   if (!query) {
//     return res.status(400).json({ error: 'Search query is required' });
//   }

//   try {
//     console.log("Search query received:", query); // Log the query

//     // Query all collections in the database
//     const foodItems = await FoodItems.find({ title: { $regex: query, $options: 'i' } }).exec();
//     const freshJuice = await FreshJuice.find({ title: { $regex: query, $options: 'i' } }).exec();
//     const frankiesRolls = await Frankies_Rolls.find({ title: { $regex: query, $options: 'i' } }).exec();
//     const annaDishes = await AnnaDishes.find({ title: { $regex: query, $options: 'i' } }).exec();

//     console.log("Food Items:", foodItems); // Log the results
//     console.log("Fresh Juice:", freshJuice);
//     console.log("Frankies Rolls:", frankiesRolls);
//     console.log("Anna Dishes:", annaDishes);

//     // Combine results
//     const results = [...foodItems, ...freshJuice, ...frankiesRolls, ...annaDishes];
//     res.json(results);
//   } catch (error) {
//     console.error('Error fetching search results:', error); // Log the error
//     res.status(500).json({ error: 'Failed to fetch search results' });
//   }
// });


// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
