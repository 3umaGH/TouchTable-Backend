export type NotificationType =
  | "READY_FOR_DELIVERY"
  | "ORDER_ITEM_CANCELLED"
  | "NEED_ASSISTANCE"
  | "NEW_ORDER"
  | "CHECK_REQUESTED";

export type Notification = {
  id: string;
  time: number;
  origin: number; // Origin table ID
  type: NotificationType;
  active: boolean;

  extraData: {
    orderItemID?: string;
    orderID?: number[];
    paymentBy?: "cash" | "card";
  };
};
