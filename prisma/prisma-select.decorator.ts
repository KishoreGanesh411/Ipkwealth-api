import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { PrismaSelect } from '@paljs/plugins'
import { Prisma } from '@prisma/client'

const GqlSelect = createParamDecorator<Prisma.SelectAndInclude>(
  (data: unknown, ctx: ExecutionContext) =>
    new PrismaSelect(GqlExecutionContext.create(ctx).getInfo(), {dmmf: []}).value?.select
)

export { GqlSelect }
