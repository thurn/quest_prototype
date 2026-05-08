import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

export interface FirebaseRuntimeEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
}

const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const satisfies readonly (keyof FirebaseRuntimeEnv)[];

export class FirebaseConfigError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: readonly string[]) {
    super(`Missing Firebase config: ${missingKeys.join(", ")}`);
    this.name = "FirebaseConfigError";
    this.missingKeys = [...missingKeys];
  }
}

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

export function readFirebaseConfig(env: FirebaseRuntimeEnv): FirebaseOptions {
  const missingKeys = REQUIRED_KEYS.filter((key) => !present(env[key]));
  if (missingKeys.length > 0) {
    throw new FirebaseConfigError(missingKeys);
  }

  const config: FirebaseOptions = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };

  if (present(env.VITE_FIREBASE_STORAGE_BUCKET)) {
    config.storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
  }

  if (present(env.VITE_FIREBASE_MESSAGING_SENDER_ID)) {
    config.messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  }

  return config;
}

export function getFirebaseApp(
  env: FirebaseRuntimeEnv = import.meta.env as unknown as FirebaseRuntimeEnv,
): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(readFirebaseConfig(env));
}

export function getFirebaseDatabase(
  env: FirebaseRuntimeEnv = import.meta.env as unknown as FirebaseRuntimeEnv,
): Database {
  return getDatabase(getFirebaseApp(env));
}
