import { Socket } from "socket.io";
import { Restaurant } from "../restaurant/Restaurant";
import { JWTPayload, RefreshToken, UserRole } from "../types/auth";
import { decode, sign, verify } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { SocketData } from "../types/socket";
import { EventEmitter } from "stream";
import { LogSystemEvent } from "../logger/Logger";

require("dotenv");

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
        if (!token.active || Date.now() > token.exp * 1000)
          this.refreshTokens.delete(token.data.id);
      });
    }, 60000);
  };

  hasAccess = (id: string) => {
    const token = this.refreshTokens.get(id);

    return token && token.active;
  };

  getSessions = (restaurantID: number) => {
    return Array.from(this.refreshTokens)
      .filter(([_, value]) => value.data.restaurantID === restaurantID)
      .map(([_, value]) => value);
  };

  revokeTokenAccess = (id: string) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Token not found");
    if (!foundData.active) throw new Error("Access is already revoked");

    foundData.active = false;

    this.emit("refreshTokensUpdated", foundData.data.restaurantID);
  };

  updateLastLogin = (id: string, ip: string) => {
    const foundData = this.refreshTokens.get(id);

    if (!foundData) throw new Error("Invalid refresh token");
    if (!foundData.active) throw new Error("Invalid refresh token");

    LogSystemEvent(
      foundData.data.restaurantID,
      `New Login (id: ${id}, ip: ${ip}, last IP: ${foundData.lastIP || "-"})`
    );

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

    socket.data.id = foundData.data.id;
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

    setTimeout(
      () => {
        const token = this.refreshTokens.get(payload.id);
        if (token?.lastIP === null) {
          token.active = false;

          LogSystemEvent(restaurantID, `Token ${payload.id} has timed out.`);

          this.emit("refreshTokensUpdated", restaurantID);
        }
      },
      parseFloat(process.env.TOKEN_TIMEOUT_SECONDS ?? "120000") * 1000
    );

    return { id: payload.id, access: accessToken, refresh: refreshToken };
  };
}
