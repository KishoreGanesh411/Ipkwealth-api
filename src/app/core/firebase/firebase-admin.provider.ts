// src/app/firebase/firebase-admin.providers.ts
import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../../../../firebase-service-account.json';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: () => {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
      });
    }
    return admin;
  },
};
