const User = require('../models/userModel'); // Import the User model
const Order = require('../models/Order'); // Import the Order model

// Analysis endpoint logic
const getAnalysis = async (req, res) => {
  try {
    // Users Data
    const totalUsers = await User.countDocuments();

    // Active Users: Users who placed at least one order in the last 30 days
    const activeUsersData = await Order.aggregate([
      {
        $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Filter orders in the last 30 days
      },
      {
        $group: {
          _id: '$customer.email', // Group by customer email (unique identifier)
        },
      },
      {
        $count: 'activeUsers', // Count distinct users
      },
    ]);

    const activeUsers = activeUsersData[0]?.activeUsers || 0;

    // New Users: Users who registered in the last 7 days
    const newUsers = await User.countDocuments({
      registrationDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Users who registered in the last 7 days
    });

    // Orders Data
    const totalOrders = await Order.countDocuments();
    const recentOrders = await Order.countDocuments({
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Orders placed in the last 7 days
    });

    // Day with the highest order volume in the last 30 days
    const highestOrderDay = await Order.aggregate([
      {
        $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Filter orders in the last 30 days
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, // Group by date
          count: { $sum: 1 }, // Count orders per day
        },
      },
      { $sort: { count: -1 } }, // Sort by order count in descending order
      { $limit: 1 }, // Get the day with the highest order volume
    ]);

    // Average daily orders (last 30 days)
    const averageDailyOrders = await Order.aggregate([
      {
        $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Filter orders in the last 30 days
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 }, // Count total orders
        },
      },
    ]);

    const averageDailyOrdersValue = averageDailyOrders[0] ? (averageDailyOrders[0].totalOrders / 30).toFixed(2) : 0;

    // Most ordered item
    const mostOrderedItem = await Order.aggregate([
      { $unwind: '$items' }, // Unwind the items array
      {
        $group: {
          _id: '$items.name', // Group by item name
          count: { $sum: '$items.quantity' }, // Sum the quantity of each item
        },
      },
      { $sort: { count: -1 } }, // Sort by count in descending order
      { $limit: 1 }, // Get the most ordered item
    ]);

    // Total revenue and average order value
    const revenueData = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }, // Sum of all order amounts
          averageOrderValue: { $avg: '$totalAmount' }, // Average order value
        },
      },
    ]);

    // Orders by Status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus', // Group by order status
          count: { $sum: 1 }, // Count orders per status
        },
      },
    ]);

    // Top 5 Spending Customers (without null entries)
    const topSpendingCustomers = await Order.aggregate([
      {
        $match: {
          'customer.name': { $exists: true, $ne: null }, // Filter out orders where customer.email is missing or null
        },
      },
      {
        $group: {
          _id: '$customer.name', // Group by customer email
          totalSpent: { $sum: '$totalAmount' }, // Sum of total amount spent by each customer
        },
      },
      { $sort: { totalSpent: -1 } }, // Sort by total spent in descending order
      { $limit: 5 }, // Limit to the top 5 customers
    ]);

    // All Customers (including those who haven't placed any orders)
    const allUsers = await User.find({}, { name: 1 }); // Fetch all users with their emails
    const allCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$customer.name', // Group by customer email
          totalSpent: { $sum: '$totalAmount' }, // Sum of total amount spent by each customer
        },
      },
    ]);

    // Map all users to include their total spending (0 if no orders)
    const allCustomersWithSpending = allUsers.map((user) => {
      const customerSpending = allCustomers.find((c) => c._id === user.email);
      return {
        email: user.email,
        totalSpent: customerSpending ? customerSpending.totalSpent : 0, // Set totalSpent to 0 if no orders
      };
    });

    // Monthly Income
    const monthlyIncome = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, // Group by month
          totalIncome: { $sum: '$totalAmount' }, // Sum of totalAmount for each month
        },
      },
      { $sort: { _id: 1 } }, // Sort by month in ascending order
    ]);

    // Average Monthly Income
    const totalIncome = monthlyIncome.reduce((sum, month) => sum + month.totalIncome, 0);
    const averageMonthlyIncome = (totalIncome / monthlyIncome.length).toFixed(2) || 0;

    // Response
    res.json({
      usersData: {
        totalUsers,
        activeUsers,
        newUsers,
      },
      ordersData: {
        totalOrders,
        recentOrders,
        highestOrderDay: highestOrderDay[0]?._id || 'N/A', // Date with the highest order volume
        averageDailyOrders: averageDailyOrdersValue, // Average daily orders
        mostOrderedItem: mostOrderedItem[0]?._id || 'N/A', // Most ordered item
        totalRevenue: revenueData[0]?.totalRevenue || 0, // Total revenue
        averageOrderValue: revenueData[0]?.averageOrderValue.toFixed(2) || 0, // Average order value
        ordersByStatus, // Orders grouped by status
        topSpendingCustomers, // Top 5 spending customers
        allCustomers: allCustomersWithSpending, // All customers with their total spending
        monthlyIncome, // Monthly income
        averageMonthlyIncome, // Average monthly income
      },
    });
  } catch (error) {
    console.error('Error in /analysis endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getAnalysis }; // Export the getAnalysis function