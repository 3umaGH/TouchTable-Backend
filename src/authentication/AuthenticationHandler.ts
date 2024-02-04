import { Socket } from "socket.io";
import { Restaurant } from "../restaurant/Restaurant";
import { JWTPayload, RefreshToken, UserRole } from "../types/auth";
import { decode, sign, verify } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { SocketData } from "../types/socket";
import { EventEmitter } from "stream";

export class AuthenticationHandler extends EventEmitter {
  refreshTokens: Map<string, RefreshToken>;

  constructor() {
    super();
    this.refreshTokens = new Map();
    this.initalizeCleaner();
  }

  /* Cleans up expired tokens */
  initalizeCleaner = () => {
    setInterval(() => {
      this.refreshTokens.forEach((token) => {
        if (Date.now() > token.exp * 1000)
          this.refreshTokens.delete(token.data.id);
      });
    }, 60000);
  };

  getSessions = (restaurantID: number) => {
    return Array.from(this.refreshTokens)
      .filter(([_, value]) => value.data.restaurantID === restaurantID)
      .map(([_, value]) => value);
  };

  revokeTokenAccess = (id: string) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Token not found");
    if(foundData.active) throw new Error("Access is already revoked")

    foundData.active = false;
    this.emit("refreshTokensUpdated", foundData.data.restaurantID);
  };

  updateLastLogin = (id: string, ip: string) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Invalid refresh token");
    if (!foundData.active) throw new Error("Invalid refresh token");

    foundData.lastLogin = Date.now();
    foundData.lastIP = ip;

    this.emit("refreshTokensUpdated", foundData.data.restaurantID);
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
      exp: (decode(refreshToken) as { exp: number }).exp,
    });

    this.emit("refreshTokensUpdated", restaurantID);

    return { access: accessToken, refresh: refreshToken };
  };
}
