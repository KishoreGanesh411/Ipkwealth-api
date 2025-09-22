import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext) => {
  const req = GqlExecutionContext.create(ctx).getContext().req;
  return req.user ?? null;
});
