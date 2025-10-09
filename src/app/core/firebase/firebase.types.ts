import { auth } from 'firebase-admin';

export interface FirebaseAuthUser {
  firebaseUid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  token: string;
  claims: auth.DecodedIdToken;
}
