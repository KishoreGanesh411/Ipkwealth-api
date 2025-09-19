import { sharedEnvironment } from './shared';

export const environment = {
  ...sharedEnvironment,
  production: false,
  // graphqlUri: 'http://localhost:3333/graphql',
};
