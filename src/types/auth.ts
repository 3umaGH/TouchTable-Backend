export type UserRole = "admin" | "kitchen" | "waiter" | "user";

export const ROLE_WEIGHTS: Record<UserRole, number> = {
  admin: 100,
  kitchen: 50,
  waiter: 50,
  user: 0,
};

export type JWTPayload = {
  id: string;
  roles: UserRole[];
  restaurantID: number;
  tableID: number | null;
};

export type RefreshToken = {
  active: boolean;
  lastLogin: number;
  lastIP: string | null;
  data: JWTPayload;
  exp: number;
};
