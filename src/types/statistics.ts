export type StatsKey = {
  timeFrame: string;
  startTime: number;
  resetInterval: number;

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

  checks: {
    card: number;
    cash: number;
  };

  dishes: Record<string, number>;
};
