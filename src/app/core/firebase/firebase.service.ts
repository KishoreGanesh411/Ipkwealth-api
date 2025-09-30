import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from './firebase-admin.provider';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: typeof admin,
  ) {}

  get admin() {
    return this.firebase;
  }

  auth(): admin.auth.Auth {
    return this.firebase.auth();
  }
}

