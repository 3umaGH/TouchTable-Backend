import { Restaurant } from "../restaurant/Restaurant";
import { JWTPayload, UserRole } from "../types/auth";
import { sign, verify } from "jsonwebtoken";

export class AuthenticationHandler {
  refreshTokens: { token: string; active: boolean; data: JWTPayload }[];

  constructor() {
    this.refreshTokens = [];
  }

  generateNewAccessToken = async (refreshToken: string) => {
    const foundData = this.refreshTokens.find(
      (obj) => obj.token === refreshToken
    );

    if (!foundData) throw new Error("Invalid refresh token");
    if (!foundData.active) throw new Error("Invalid refresh token");

    return {
      token: await sign(foundData.data, process.env.JWT_KEY!, { expiresIn: "5m" }),
      payload: foundData.data,
    };
  };

  generateTokens = async (
    roles: UserRole[],
    restaurantID: number,
    tableID: number | null
  ) => {
    const payload: JWTPayload = {
      roles: roles,
      restaurantID: restaurantID,
      tableID: tableID,
    };

    const accessToken = await sign(payload, process.env.JWT_KEY!, {
      expiresIn: "5m",
    });
    const refreshToken = await sign({}, process.env.JWT_KEY!, { expiresIn: "30d" });

    this.refreshTokens.push({
      token: refreshToken,
      active: true,
      data: payload,
    });

    return { access: accessToken, refresh: refreshToken };
  };
}
