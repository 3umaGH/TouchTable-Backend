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
import { AuthenticationHandler } from "../../authentication/AuthenticationHandler";
import { SocketManager } from "../SocketManager";

const jwt = require("jsonwebtoken");

export const authMiddleware = (
  authenticator: AuthenticationHandler,
  socketManager: SocketManager
) => {
  return (
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

    if (!token) return next(new Error("Authorization Failed 1"));
    if (!refreshToken) return next(new Error("Authorization Failed 2"));

    const verifyAndSetData = async (token: string) =>
      await new Promise<void>(async (resolve, reject) => {
        let ip =
          socket.handshake.headers["x-forwarded-for"]?.toString() ??
          socket.handshake.address;

        try {
          const decoded = (await verify(
            token,
            process.env.JWT_KEY!
          )) as unknown as JWTPayload;

          authenticator.updateLastLogin(decoded.id, ip);
          authenticator.updateSocketDataFields(decoded.id, socket);

          resolve();
          return next();
        } catch (error) {
          reject();
        }
      });

    verifyAndSetData(token).catch(async () => {
      try {
        const decoded = (await verify(refreshToken, process.env.JWT_KEY!)) as {
          id: string;
        };

        const newAccess = await authenticator.generateNewAccessToken(
          decoded.id,
          socket.handshake.address
        );

        socketManager.pushTokenRefreshQueue(socket.id, newAccess.token);
        authenticator.updateLastLogin(decoded.id, socket.handshake.address);
        authenticator.updateSocketDataFields(decoded.id, socket);

        return next();
      } catch (err) {
        return next(new Error("Authorization Failed 3 "));
      }
    });
  };
};
