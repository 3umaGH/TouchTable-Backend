import { Socket } from "socket.io";
import { Restaurant } from "../restaurant/Restaurant";
import { JWTPayload, UserRole } from "../types/auth";
import { sign, verify } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { SocketData } from "../types/socket";

export class AuthenticationHandler {
  refreshTokens: Map<
    string,
    {
      active: boolean;
      lastLogin: number;
      lastIP: string | null;
      data: JWTPayload;
    }
  >;

  constructor() {
    this.refreshTokens = new Map();
  }

  updateLastLogin = (id: string, ip: string) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Invalid refresh token");

    foundData.lastLogin = Date.now();
    foundData.lastIP = ip;
  };

  updateSocketDataFields = (
    id: string,
    socket: Socket<any, any, any, SocketData>
  ) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Invalid refresh token");

    socket.data.roles = foundData.data.roles;
    socket.data.restaurantID = foundData.data.restaurantID;
    socket.data.tableID = foundData.data.tableID;
  };

  generateNewAccessToken = async (id: string, ip: string) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Invalid refresh token");
    if (!foundData.active) throw new Error("Invalid refresh token");

    return {
      token: await sign(foundData.data, process.env.JWT_KEY!, {
        expiresIn: "5m",
      }),
      payload: foundData.data,
    };
  };

  generateTokens = async (
    roles: UserRole[],
    restaurantID: number,
    tableID: number | null
  ) => {
    const payload: JWTPayload = {
      id: uuidv4(),
      roles: roles,
      restaurantID: restaurantID,
      tableID: tableID,
    };

    const accessToken = await sign(payload, process.env.JWT_KEY!, {
      expiresIn: "5m",
    });
    const refreshToken = await sign({ id: payload.id }, process.env.JWT_KEY!, {
      expiresIn: "30d",
    });

    this.refreshTokens.set(payload.id, {
      active: true,
      lastLogin: Date.now(),
      lastIP: null,
      data: payload,
    });

    return { access: accessToken, refresh: refreshToken };
  };
}
