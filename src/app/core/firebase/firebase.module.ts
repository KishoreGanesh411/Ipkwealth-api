import { Global, Module } from '@nestjs/common';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [FirebaseAdminProvider, FirebaseService],
  exports: [FirebaseAdminProvider, FirebaseService],
})
export class FirebaseModule { }
