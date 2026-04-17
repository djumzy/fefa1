import 'dotenv/config';
import { storage } from './server/storage';
import { hashPin } from './server/auth';

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmins = await storage.getUsers({ role: 'admin' });
    if (existingAdmins.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash a default PIN, say '1234'
    const hashedPin = await hashPin('1234');

    // Create admin user
    const admin = await storage.createUser({
      userId: 'TD000001',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      email: 'admin@fefa.com',
      pin: hashedPin,
      role: 'admin',
      isActive: true,
      location: 'Head Office',
    });

    console.log('Admin user created:', admin);
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}

seedAdmin();