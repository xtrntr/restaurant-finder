import mongoose from 'mongoose';
import config from '../config';
import Restaurant from '../models/Restaurant';

async function getSampleRestaurant() {
  try {
    // Connect to the database
    console.log(`Connecting to MongoDB at ${config.db.uri}`);
    await mongoose.connect(config.db.uri);
    console.log('Connected to MongoDB successfully');

    // Fetch one restaurant
    const restaurant = await Restaurant.findOne({}).lean();
    
    // Output the restaurant data
    console.log('Sample Restaurant Record:');
    console.log(JSON.stringify(restaurant, null, 2));
    
    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

// Run the function
getSampleRestaurant(); 