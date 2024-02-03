import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/socket";
import { ExtendedError } from "socket.io/dist/namespace";
import { JWTPayload } from "../../types/auth";
import { verify } from "jsonwebtoken";
import { authHandler, socketManager } from "../..";

const jwt = require("jsonwebtoken");

export const authMiddleware = (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  next: (err?: ExtendedError | undefined) => void
) => {
  const token = socket.handshake.auth.token;
  const refreshToken = socket.handshake.auth.refreshToken;

  if (!token) return next(new Error("Authorization Failed"));
  if (!refreshToken) return next(new Error("Authorization Failed"));

  const verifyAndSetData = async (token: string) =>
    await new Promise<void>(async (resolve, reject) => {
      try {
        const decoded = (await verify(
          token,
          process.env.JWT_KEY!
        )) as unknown as JWTPayload;

        socket.data.roles = [...decoded.roles];
        socket.data.restaurantID = decoded.restaurantID;
        socket.data.tableID = decoded.tableID;

        resolve();
        return next();
      } catch (error) {
        reject();
      }
    });

  verifyAndSetData(token).catch(async () => {
    try {
      const decoded = await verify(refreshToken, process.env.JWT_KEY!);

      const newAccess = await authHandler.generateNewAccessToken(refreshToken);

      socket.data.roles = [...newAccess.payload.roles];
      socket.data.restaurantID = newAccess.payload.restaurantID;
      socket.data.tableID = newAccess.payload.tableID;

      socketManager.pushTokenRefreshQueue(socket.id, newAccess.token);
      return next();
    } catch (err) {
      return next(new Error("Authorization Failed"));
    }
  });
};
