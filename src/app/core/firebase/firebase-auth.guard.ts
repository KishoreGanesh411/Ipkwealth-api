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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    const token = this.extractBearerToken(req);

    if (!token) {
      throw new UnauthorizedException('Authorization header missing or malformed');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      // Control revocation checks via env (default: false to improve dev stability)
      const checkRevoked = String(process.env.FIREBASE_CHECK_REVOKED ?? 'false') === 'true';
      decoded = await this.firebase.auth().verifyIdToken(token, checkRevoked);
    } catch (e: unknown) {
      const code = this.readAuthErrorCode(e);
      if (code === 'auth/id-token-expired') {
        throw new UnauthorizedException('ID_TOKEN_EXPIRED');
      }
      if (code === 'auth/id-token-revoked') {
        throw new UnauthorizedException('ID_TOKEN_REVOKED');
      }
      throw new UnauthorizedException('INVALID_ID_TOKEN');
    }

    const firebaseUser: FirebaseAuthUser = {
      firebaseUid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : null,
      emailVerified: Boolean(decoded.email_verified ?? false),
      name: typeof decoded.name === 'string' ? decoded.name : null,
      picture: typeof decoded.picture === 'string' ? decoded.picture : null,
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
      const req = gqlCtx.getContext<{ req?: FirebaseAuthRequest }>()?.req;
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
      for (const h of header) {
        if (typeof h === 'string' && h.startsWith('Bearer ')) {
          const token = h.slice(7).trim();
          return token.length > 0 ? token : null;
        }
      }
      return null;
    }

    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  /** Safely read Firebase admin error code without using `any`. */
  private readAuthErrorCode(err: unknown): string | undefined {
    if (typeof err !== 'object' || err === null) return undefined;
    const obj = err as { errorInfo?: { code?: unknown }; code?: unknown };
    const fromInfo = obj.errorInfo?.code;
    if (typeof fromInfo === 'string') return fromInfo;
    if (typeof obj.code === 'string') return obj.code;
    return undefined;
  }
}
