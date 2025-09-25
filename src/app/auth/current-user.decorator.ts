import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator((_data, ctx: ExecutionContext) => {
  const gql = GqlExecutionContext.create(ctx);
  const req = gql.getContext()?.req ?? ctx.switchToHttp().getRequest();
  // FirebaseAuthGuard sets req.user to the DB user
  return req?.user ?? null;
});
