import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashValue = (value: string) => bcrypt.hash(value, SALT_ROUNDS);
export const compareHash = (plain: string, hashed: string) => bcrypt.compare(plain, hashed);
