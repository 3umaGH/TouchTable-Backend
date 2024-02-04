export type UserRole = "admin" | "kitchen" | "waiter" | "user";

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
  exp: number,
};
