export type StatsKey = {
  timeFrame: string;
  startTime: number;

  orders: {
    finished: number;
    cancelled: number;
    total: number;

    totalItems: number;
    totalTurnover: number;
  };

  notifications: {
    assistanceRequests: number;
  };

  dishes: Record<string, number>;
};
