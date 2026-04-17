import 'dotenv/config';
import { storage } from './server/storage';
import { hashPin } from './server/auth';

async function updateAdminPin() {
  try {
    // Get the admin user
    const admins = await storage.getUsers({ role: 'admin' });
    if (admins.length === 0) {
      console.log('No admin user found');
      return;
    }

    const admin = admins[0];

    // Hash new PIN: 6 digits for admin as per validation
    const newPin = '123456';
    const hashedPin = await hashPin(newPin);

    // Update the user
    const updated = await storage.updateUser(admin.id, { pin: hashedPin });

    if (updated) {
      console.log('Admin PIN updated to 5 digits:', newPin);
      console.log('Updated user:', updated);
    } else {
      console.log('Failed to update admin');
    }
  } catch (error) {
    console.error('Error updating admin PIN:', error);
  }
}

updateAdminPin();