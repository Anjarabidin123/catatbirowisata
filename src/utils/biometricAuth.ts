import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import { Capacitor } from "@capacitor/core";

export interface BiometricCredentials {
  email: string;
  password: string;
}

const CREDENTIALS_KEY = "malika_biometric_credentials";

export const biometricAuth = {
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error("Biometric check error:", error);
      return false;
    }
  },

  async getBiometryType(): Promise<BiometryType | null> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType;
    } catch (error) {
      return null;
    }
  },

  async saveCredentials(credentials: BiometricCredentials): Promise<boolean> {
    try {
      await NativeBiometric.setCredentials({
        username: credentials.email,
        password: credentials.password,
        server: CREDENTIALS_KEY,
      });
      return true;
    } catch (error) {
      console.error("Save credentials error:", error);
      return false;
    }
  },

  async getCredentials(): Promise<BiometricCredentials | null> {
    try {
      // Verify biometric first
      await NativeBiometric.verifyIdentity({
        reason: "Login dengan biometrik",
        title: "Autentikasi Biometrik",
        subtitle: "Gunakan fingerprint atau Face ID",
        description: "Verifikasi identitas untuk login",
      });

      // Get credentials after successful verification
      const credentials = await NativeBiometric.getCredentials({
        server: CREDENTIALS_KEY,
      });

      return {
        email: credentials.username,
        password: credentials.password,
      };
    } catch (error) {
      console.error("Get credentials error:", error);
      return null;
    }
  },

  async deleteCredentials(): Promise<boolean> {
    try {
      await NativeBiometric.deleteCredentials({
        server: CREDENTIALS_KEY,
      });
      return true;
    } catch (error) {
      console.error("Delete credentials error:", error);
      return false;
    }
  },
};
