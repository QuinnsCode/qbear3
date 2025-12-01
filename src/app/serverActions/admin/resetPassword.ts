// @/app/serverActions/admin/resetPassword.ts
"use server";

import { db } from "@/db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Hash password using scrypt (same as better-auth)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function forcePasswordReset(email: string, newPassword: string) {
  try {
    // Find the user
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Hash the new password using scrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update the account table with new hashed password
    const updated = await db.account.updateMany({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      data: {
        password: hashedPassword,
      },
    });

    if (updated.count === 0) {
      return {
        success: false,
        error: "No credential account found for this user",
      };
    }

    console.log(`✅ Password reset for ${user.email} (${user.name})`);

    return {
      success: true,
      message: `Password successfully reset for ${user.email}`,
      user: {
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}