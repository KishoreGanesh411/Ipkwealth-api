import { sharedEnvironment } from './shared';

export const environment = {
  ...sharedEnvironment,
  production: true,
  /* cspell:disable-next-line */
  googleClientId: '',
  /* cspell:disable-next-line */
  firebaseBucketName: '',
};
