/**
 * Read-Only Inspection of Demo Accounts in Firebase Auth & Firestore
 */
import { getFirebaseAuth, getFirestore } from '../lib/firebase-admin';
import { COLLECTIONS } from '../repositories/collections';
import { DEMO_ACCOUNTS } from '../../lib/auth-helpers';

async function inspectDemoAccounts() {
  console.log('====================================================');
  console.log('READ-ONLY INSPECTION: DEMO ACCOUNTS IN FIREBASE');
  console.log('====================================================\n');

  const auth = getFirebaseAuth();
  const db = getFirestore();

  console.log('1. Checking the 6 target demo accounts:');
  for (const [key, config] of Object.entries(DEMO_ACCOUNTS)) {
    console.log(`\n--- Target: ${config.label} (${config.role}) ---`);
    console.log(`  Mobile: ${config.mobile}`);
    console.log(`  Target Email: ${config.email}`);

    // Check Firebase Auth
    let authUser = null;
    try {
      authUser = await auth.getUserByEmail(config.email);
      console.log(`  Firebase Auth: EXISTS (UID: ${authUser.uid}, disabled: ${authUser.disabled})`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        console.log(`  Firebase Auth: DOES NOT EXIST`);
      } else {
        console.log(`  Firebase Auth: ERROR (${err.message})`);
      }
    }

    // Check Firestore by UID or email or phone
    if (authUser) {
      const docSnap = await db.collection(COLLECTIONS.USERS).doc(authUser.uid).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        console.log(`  Firestore users/{uid}: EXISTS (Role: ${data?.role}, Status: ${data?.status}, Verified: ${data?.verified})`);
      } else {
        console.log(`  Firestore users/{uid}: MISSING (doc does not exist)`);
      }
    } else {
      // Check if any doc exists with matching email
      const queryByEmail = await db.collection(COLLECTIONS.USERS).where('email', '==', config.email).get();
      if (!queryByEmail.empty) {
        console.log(`  Firestore users (by email): FOUND ${queryByEmail.size} doc(s)`);
      } else {
        console.log(`  Firestore users (by email): NONE`);
      }
    }
  }

  console.log('\n2. Listing existing users in Firestore (read-only):');
  const allUsersSnap = await db.collection(COLLECTIONS.USERS).get();
  console.log(`Total users in Firestore: ${allUsersSnap.size}`);
  allUsersSnap.forEach((doc) => {
    const d = doc.data();
    console.log(` - UID: ${doc.id.slice(0, 8)}... | Email: ${d.email} | Role: ${d.role} | Status: ${d.status} | Phone: ${d.phone || 'none'}`);
  });

  console.log('\n====================================================');
  console.log('INSPECTION COMPLETED');
  console.log('====================================================');
}

inspectDemoAccounts().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
