import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FirebaseAuthRequest } from '../core/firebase/firebase-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const gql = GqlExecutionContext.create(ctx);
    const reqFromGql = ((): FirebaseAuthRequest | undefined => {
      try {
        return gql.getContext<{ req?: FirebaseAuthRequest }>()?.req;
      } catch {
        return undefined;
      }
    })();

    const req = reqFromGql ?? ctx.switchToHttp().getRequest<FirebaseAuthRequest>();
    return req?.user ?? null;
  },
);
