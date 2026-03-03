// serverActions/user/setPassword.ts
"use server"

import { auth } from "@/lib/auth"
import { requestInfo } from "rwsdk/worker"

export async function setUserPassword(newPassword: string) {
  try {
    const { request } = requestInfo

    // Validate password strength
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long"
      }
    }

    // Call better-auth setPassword API
    await auth.api.setPassword({
      body: { newPassword },
      headers: request.headers  // Contains session token
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to set password:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set password"
    }
  }
}
