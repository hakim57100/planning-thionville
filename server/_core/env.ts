export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
