import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from './firebase-admin.provider';
import { FirebaseAuthUser } from './firebase.types';

export interface FirebaseAuthRequest extends Request {
  firebaseUser?: FirebaseAuthUser;
  user?: unknown;
  dbUser?: unknown;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_ADMIN) protected readonly firebase: typeof admin,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization header missing or malformed');
    }

    try {
      const decoded = await this.firebase.auth().verifyIdToken(token, true);
      const firebaseUser: FirebaseAuthUser = {
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified ?? false,
        name: decoded.name ?? null,
        picture: decoded.picture ?? null,
        token,
        claims: decoded,
      };

      request.firebaseUser = firebaseUser;
      request.user = firebaseUser;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Firebase token is invalid or revoked');
    }
  }

  protected getRequest(context: ExecutionContext): FirebaseAuthRequest {
    return context.switchToHttp().getRequest<FirebaseAuthRequest>();
  }

  private extractBearerToken(request: FirebaseAuthRequest): string | null {
    const header = request.headers?.authorization;

    if (Array.isArray(header)) {
      const bearer = header.find((value) =>
        typeof value === 'string' && value.startsWith('Bearer '),
      );
      return bearer ? bearer.slice(7).trim() || null : null;
    }

    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return null;
    }

    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }
}
