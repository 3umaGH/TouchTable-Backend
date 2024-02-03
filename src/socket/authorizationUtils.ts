import { Socket } from "socket.io";
import { JWTPayload, UserRole } from "../types/auth";
import { sign, verify } from "jsonwebtoken";
import { SocketData } from "../types/socket";

export const hasRole = (
  socket: Socket<any, any, any, SocketData>,
  restaurantID: number,
  ...roles: UserRole[]
) => {
  return (
    socket.data.restaurantID === restaurantID &&
    roles.some((approvedRole) => socket.data.roles.includes(approvedRole))
  );
};

export const hasTablePermissions = (
  socket: Socket<any, any, any, SocketData>,
  tableID: number
) => {
  return tableID === socket.data.tableID;
};

