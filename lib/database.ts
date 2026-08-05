import mongoose, { Mongoose } from "mongoose";

interface MongooseCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  connection: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDatabase(): Promise<Mongoose> {
  if (cached.connection) {
    return cached.connection;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "A variável DATABASE_URL não foi configurada no arquivo .env.local.",
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(databaseUrl, {
      bufferCommands: false,
    });
  }

  try {
    cached.connection = await cached.promise;

    return cached.connection;
  } catch (error) {
    cached.promise = null;
    cached.connection = null;

    throw error;
  }
}
