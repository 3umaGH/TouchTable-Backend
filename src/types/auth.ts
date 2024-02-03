export type UserRole = "admin" | "kitchen" | "waiter" | "user";

export type JWTPayload = {
    id: string,
    roles: UserRole[],
    restaurantID: number,
    tableID: number | null,
}