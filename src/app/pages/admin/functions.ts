// app/pages/admin/functions.ts
import { authClient } from "@/lib/auth-client";

export type AdminRole = "user" | "admin";

export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateUserData {
  name?: string;
  email: string;
  password: string;
  role?: AdminRole;
}

/** better-auth client calls resolve to `{ data, error }` instead of throwing; hand back `data` or throw the error. */
function unwrap<T>(res: { data: T | null; error: { message?: string } | null }): T {
  if (res.error) throw new Error(res.error.message ?? "Request failed");
  if (res.data === null) throw new Error("Empty response");
  return res.data;
}

export interface ListUsersQuery {
  limit?: number;
  offset?: number;
  searchField?: "email" | "name";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  searchValue?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterField?: string;
  filterOperator?: "eq" | "contains" | "starts_with" | "ends_with";
  filterValue?: string;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
  limit?: number;
  offset?: number;
}

// Create a new user
export const createUser = async (userData: CreateUserData): Promise<User> => {
  try {
    const result = unwrap(await authClient.admin.createUser({
      name: userData.name ?? "",
      email: userData.email,
      password: userData.password,
      role: userData.role || "admin",
    }));
    return result.user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// List all users with pagination and filtering
export const listUsers = async (query: ListUsersQuery = {}): Promise<ListUsersResponse> => {
  try {
    const result = unwrap(await authClient.admin.listUsers({
      query: {
        limit: query.limit || 10,
        offset: query.offset || 0,
        searchField: query.searchField,
        searchOperator: query.searchOperator,
        searchValue: query.searchValue,
        sortBy: query.sortBy || "createdAt",
        sortDirection: query.sortDirection || "desc",
        filterField: query.filterField,
        filterOperator: query.filterOperator,
        filterValue: query.filterValue,
      }
    }));
    return result;
  } catch (error) {
    console.error("Error listing users:", error);
    throw error;
  }
};

// Set user role
export const setUserRole = async (userId: string, role: AdminRole): Promise<User> => {
  try {
    const result = unwrap(await authClient.admin.setRole({
      userId,
      role,
    }));
    return result.user;
  } catch (error) {
    console.error("Error setting user role:", error);
    throw error;
  }
};

// Ban a user
export const banUser = async (
  userId: string, 
  banReason?: string, 
  banExpiresIn?: number
): Promise<User> => {
  try {
    const result = unwrap(await authClient.admin.banUser({
      userId,
      banReason,
      banExpiresIn,
    }));
    return result.user;
  } catch (error) {
    console.error("Error banning user:", error);
    throw error;
  }
};

// Unban a user
export const unbanUser = async (userId: string): Promise<User> => {
  try {
    const result = unwrap(await authClient.admin.unbanUser({
      userId,
    }));
    return result.user;
  } catch (error) {
    console.error("Error unbanning user:", error);
    throw error;
  }
};

// List user sessions
export const listUserSessions = async (userId: string): Promise<UserSession[]> => {
  try {
    const result = unwrap(await authClient.admin.listUserSessions({
      userId,
    }));
    return result.sessions;
  } catch (error) {
    console.error("Error listing user sessions:", error);
    throw error;
  }
};

// Revoke user session
export const revokeUserSession = async (sessionToken: string) => {
  try {
    const result = unwrap(await authClient.admin.revokeUserSession({
      sessionToken,
    }));
    return result;
  } catch (error) {
    console.error("Error revoking user session:", error);
    throw error;
  }
};

// Revoke all user sessions
export const revokeAllUserSessions = async (userId: string) => {
  try {
    const result = unwrap(await authClient.admin.revokeUserSessions({
      userId,
    }));
    return result;
  } catch (error) {
    console.error("Error revoking all user sessions:", error);
    throw error;
  }
};

// Impersonate user
export const impersonateUser = async (userId: string) => {
  try {
    const result = unwrap(await authClient.admin.impersonateUser({
      userId,
    }));
    return result;
  } catch (error) {
    console.error("Error impersonating user:", error);
    throw error;
  }
};

// Stop impersonating
export const stopImpersonating = async () => {
  try {
    const result = unwrap(await authClient.admin.stopImpersonating());
    return result;
  } catch (error) {
    console.error("Error stopping impersonation:", error);
    throw error;
  }
};

// Remove user (hard delete)
export const removeUser = async (userId: string): Promise<{ success: boolean }> => {
  try {
    const result = unwrap(await authClient.admin.removeUser({
      userId,
    }));
    return result;
  } catch (error) {
    console.error("Error removing user:", error);
    throw error;
  }
};