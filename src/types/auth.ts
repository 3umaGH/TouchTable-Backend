export type UserRole = "admin" | "kitchen" | "waiter" | "user";

export type JWTPayload = {
    roles: UserRole[],
    restaurantID: number,
    tableID: number | null,
}