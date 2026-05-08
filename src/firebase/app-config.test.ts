import { describe, expect, it } from "vitest";
import { FirebaseConfigError, readFirebaseConfig } from "./app-config";

const completeEnv = {
  VITE_FIREBASE_API_KEY: "api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "quest.example.firebaseapp.com",
  VITE_FIREBASE_DATABASE_URL: "https://quest.example.firebaseio.com",
  VITE_FIREBASE_PROJECT_ID: "quest-example",
  VITE_FIREBASE_APP_ID: "1:123:web:abc",
  VITE_FIREBASE_STORAGE_BUCKET: "quest.example.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
};

describe("readFirebaseConfig", () => {
  it("maps Vite Firebase env values to Firebase config", () => {
    expect(readFirebaseConfig(completeEnv)).toEqual({
      apiKey: "api-key",
      authDomain: "quest.example.firebaseapp.com",
      databaseURL: "https://quest.example.firebaseio.com",
      projectId: "quest-example",
      appId: "1:123:web:abc",
      storageBucket: "quest.example.appspot.com",
      messagingSenderId: "123",
    });
  });

  it("omits blank optional values", () => {
    expect(
      readFirebaseConfig({
        ...completeEnv,
        VITE_FIREBASE_STORAGE_BUCKET: "",
        VITE_FIREBASE_MESSAGING_SENDER_ID: "",
      }),
    ).toEqual({
      apiKey: "api-key",
      authDomain: "quest.example.firebaseapp.com",
      databaseURL: "https://quest.example.firebaseio.com",
      projectId: "quest-example",
      appId: "1:123:web:abc",
    });
  });

  it("throws a typed error listing missing required keys", () => {
    expect(() =>
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: "",
        VITE_FIREBASE_AUTH_DOMAIN: "quest.example.firebaseapp.com",
        VITE_FIREBASE_DATABASE_URL: "",
        VITE_FIREBASE_PROJECT_ID: "quest-example",
        VITE_FIREBASE_APP_ID: "1:123:web:abc",
      }),
    ).toThrow(FirebaseConfigError);

    try {
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: "",
        VITE_FIREBASE_AUTH_DOMAIN: "quest.example.firebaseapp.com",
        VITE_FIREBASE_DATABASE_URL: "",
        VITE_FIREBASE_PROJECT_ID: "quest-example",
        VITE_FIREBASE_APP_ID: "1:123:web:abc",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(FirebaseConfigError);
      expect((error as FirebaseConfigError).missingKeys).toEqual([
        "VITE_FIREBASE_API_KEY",
        "VITE_FIREBASE_DATABASE_URL",
      ]);
    }
  });
});
