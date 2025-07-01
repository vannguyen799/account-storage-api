import { ObjectId } from "mongodb";

// Types cho dữ liệu account
export type AccountValue = {
  [key: string]: any;
};

export type AccountData = {
  account: string;
  project: string;
  values: AccountValue;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AccountDocument = {
  _id: ObjectId;
} & AccountData;

// Types cho response
export type ApiResponse<T = any> = {
  status: "success" | "error";
  message: string;
  data?: T;
};

// Types cho các query parameters
export type GetQueryParams = {
  account: string;
  project: string;
}; 