import { SocketData } from "../types/socket";
import { COLOR } from "./ConsoleColors";

export const LogEvent = (
  restaurantID: number,
  socketData: SocketData,
  message: string
) => {
  const ROLE_COLORS = {
    admin: COLOR.RED,
    waiter: COLOR.BLUE,
    kitchen: COLOR.CYAN,
    user: COLOR.YELLOW,
  };

  const now = new Date();

  console.log(
    `${COLOR.BLUE}[${restaurantID}] ${
      COLOR.GRAY
    }(${now.toLocaleDateString()} ${now.toLocaleTimeString()}) ${
      COLOR.LIGHT_GREEN
    }${message} ${COLOR.GRAY}(Initiator: ${socketData.id.substring(
      24,
      37
    )}, roles: [ ${socketData.roles
      .map((role) => ROLE_COLORS[role] + role)
      .join(", ")}${COLOR.GRAY} ], ${
      socketData.tableID
        ? `table: ${COLOR.MAGENTA}(${socketData.tableID})${COLOR.GRAY}, `
        : ""
    }IP: ${socketData.ip})${COLOR.RESET}`
  );
};

export const LogSystemEvent = (restaurantID: number, message: string) => {
  const ROLE_COLORS = {
    admin: COLOR.RED,
    waiter: COLOR.BLUE,
    kitchen: COLOR.CYAN,
    user: COLOR.YELLOW,
  };

  const now = new Date();

  console.log(
    `${COLOR.BLUE}[${restaurantID}] ${
      COLOR.GRAY
    }(${now.toLocaleDateString()} ${now.toLocaleTimeString()}) ${
      COLOR.CYAN
    }${message} ${COLOR.GRAY}(Initiator: ${COLOR.YELLOW}SYSTEM${COLOR.GRAY})${
      COLOR.RESET
    }`
  );
};
