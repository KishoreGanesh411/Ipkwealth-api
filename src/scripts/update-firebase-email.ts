// scripts/update-firebase-email.ts

import 'dotenv/config';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (depending on how you have your credentials)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

async function main() {
    const firebaseUid = 'DzMaDhNY37h0s0oCIAKlXeXw9Hp2'; // replace by Bharath’s firebaseUid
    const newEmail = 'bharath@ipkwealth.com'; // the correct email
    const newDisplayName = 'Bharath'; // if you also want to update name

    try {
        const userRecord = await admin.auth().updateUser(firebaseUid, {
            email: newEmail,
            displayName: newDisplayName,
        });
        console.log('Firebase user updated:', userRecord.uid, userRecord.email, userRecord.displayName);
    } catch (error) {
        console.error('Error updating Firebase user:', error);
    }
}

main();
