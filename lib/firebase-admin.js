import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK (server-side only)
let adminDb;

if (!getApps().length) {
  try {
    // Check if we have the required environment variables
    if (
      !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.warn(
        "Firebase Admin SDK: Missing environment variables. Admin features will not work."
      );
    } else {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
      adminDb = getFirestore(app);
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
} else {
  adminDb = getFirestore();
}

export { adminDb };

