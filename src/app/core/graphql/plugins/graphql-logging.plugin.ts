import { Logger } from '@nestjs/common';
import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from '@apollo/server';

// Minimal Apollo Server plugin to log GraphQL operations in dev
export class GraphQLLoggingPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger('GraphQL');

  requestDidStart(_ctx: GraphQLRequestContext<any>): Promise<GraphQLRequestListener<any>> {
    void _ctx;
    const start = process.hrtime.bigint();

    return Promise.resolve({
      willSendResponse: async (ctx) => {
        const opName = ctx.request.operationName ?? 'anonymous';
        const opType = ctx.operation?.operation ?? 'unknown';
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
        const hasErrors = Array.isArray(ctx.errors) && ctx.errors.length > 0;
        const status = hasErrors ? 'ERROR' : 'OK';
        this.logger.log(`${String(opType).toUpperCase()} ${opName} - ${status} ${ms.toFixed(0)}ms`);
        await Promise.resolve();
      },
    });
  }
}
