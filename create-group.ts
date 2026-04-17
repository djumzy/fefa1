import 'dotenv/config';
import { storage } from './server/storage';

async function createSampleGroup() {
  try {
    // Get the admin user
    const admins = await storage.getUsers({ role: 'admin' });
    if (admins.length === 0) {
      console.log('No admin user found');
      return;
    }

    const admin = admins[0];

    // Create a sample group
    const group = await storage.createGroup({
      name: 'Sample Group',
      location: 'Test Location',
      interestRate: 10,
      maxMembers: 20,
      meetingFrequency: 'weekly',
      shareValue: 100,
      welfareAmount: 50,
      registrationDate: new Date(),
      createdBy: admin.id, // admin id
    });

    console.log('Sample group created:', group);
  } catch (error) {
    console.error('Error creating sample group:', error);
  }
}

createSampleGroup();