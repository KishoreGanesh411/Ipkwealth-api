import * as bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 12;

const getSaltRounds = (): number => {
  const fromEnv = process.env.BCRYPT_SALT_ROUNDS;
  const parsed = fromEnv ? Number(fromEnv) : DEFAULT_SALT_ROUNDS;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_SALT_ROUNDS;
};

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, getSaltRounds());
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};
