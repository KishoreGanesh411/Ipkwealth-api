import * as bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 12;

const getSaltRounds = (): number => {
  const fromEnv = process.env.BCRYPT_SALT_ROUNDS;
  const parsed = fromEnv ? Number(fromEnv) : DEFAULT_SALT_ROUNDS;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_SALT_ROUNDS;
};

// Narrow the bcrypt API to typed wrappers so eslint doesn't see `any`
type BcryptLike = {
  hash: (data: string, saltOrRounds: number) => Promise<string>;
  compare: (data: string, encrypted: string) => Promise<boolean>;
};
const b: BcryptLike = bcrypt as unknown as BcryptLike;

export const hashPassword = (plain: string): Promise<string> => b.hash(plain, getSaltRounds());

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  b.compare(plain, hash);
