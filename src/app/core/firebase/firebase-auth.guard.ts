import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { UserApiService } from '../../user/user-api.service';
import { FIREBASE_ADMIN } from './firebase-admin.provider';
import { FirebaseAuthUser } from './firebase.types';

export interface FirebaseAuthRequest extends Request {
  firebaseUser?: FirebaseAuthUser;
  user?: unknown; // will hold the DB user
  dbUser?: unknown; // optional alias
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: typeof admin,
    protected readonly users: UserApiService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    const token = this.extractBearerToken(req);

    if (!token) {
      throw new UnauthorizedException('Authorization header missing or malformed');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      // pass true if you want revocation checks; set to false if not needed
      decoded = await this.firebase.auth().verifyIdToken(token, true);
    } catch {
      throw new UnauthorizedException('Firebase token is invalid or revoked');
    }

    const firebaseUser: FirebaseAuthUser = {
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
      token,
      claims: decoded,
    };

    // ⭐ Persist / sync the DB user every authenticated request
    const dbUser = await this.users.upsertFromFirebase(firebaseUser);

    // Attach both to the request so resolvers can access them
    req.firebaseUser = firebaseUser;
    req.dbUser = dbUser;
    req.user = dbUser; // what CurrentUser decorator reads

    return true;
  }

  /** Works for both GraphQL and REST contexts */
  protected getRequest(context: ExecutionContext): FirebaseAuthRequest {
    // GraphQL
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const req = gqlCtx.getContext()?.req as FirebaseAuthRequest | undefined;
      if (req) return req;
    } catch {
      /* no-op */
    }

    // HTTP
    return context.switchToHttp().getRequest<FirebaseAuthRequest>();
  }

  private extractBearerToken(request: FirebaseAuthRequest): string | null {
    const header = request.headers?.authorization;

    if (Array.isArray(header)) {
      const bearer = header.find(
        (value) => typeof value === 'string' && value.startsWith('Bearer '),
      );
      return bearer ? bearer.slice(7).trim() || null : null;
    }

    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }
}
