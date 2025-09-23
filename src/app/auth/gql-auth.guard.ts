import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import * as admin from 'firebase-admin';
import {
  FirebaseAuthGuard,
  FirebaseAuthRequest,
} from '../core/firebase/firebase-auth.guard';
import { FIREBASE_ADMIN } from '../core/firebase/firebase-admin.provider';
import { UserApiService } from '../user/user-api.service';

@Injectable()
export class GqlAuthGuard extends FirebaseAuthGuard {
  constructor(
    @Inject(FIREBASE_ADMIN) firebase: typeof admin,
    private readonly users: UserApiService,
  ) {
    super(firebase);
  }

  protected getRequest(context: ExecutionContext): FirebaseAuthRequest {
    const gqlCtx = GqlExecutionContext.create(context);
    return gqlCtx.getContext().req as FirebaseAuthRequest;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = await super.canActivate(context);
    if (!activated) {
      return false;
    }

    const request = this.getRequest(context);
    const firebaseUser = request.firebaseUser;

    if (!firebaseUser) {
      throw new UnauthorizedException(
        'Firebase authentication missing user payload',
      );
    }

    const user = await this.users.upsertFromFirebase(firebaseUser);

    if (!user || user.archived) {
      throw new UnauthorizedException(
        'User is not allowed to access this resource',
      );
    }

    request.dbUser = user;
    request.user = user;

    return true;
  }
}
