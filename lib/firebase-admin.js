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
      // Process private key - handle different formats from Vercel
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Vercel stores environment variables as strings, so \n is escaped
      // Replace escaped newlines with actual newlines
      if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }
      
      // Remove quotes if present (sometimes Vercel adds them)
      privateKey = privateKey.replace(/^["']|["']$/g, "");
      
      const app = initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      adminDb = getFirestore(app);
      console.log("Firebase Admin SDK initialized successfully");
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }
} else {
  adminDb = getFirestore();
}

export { adminDb };

