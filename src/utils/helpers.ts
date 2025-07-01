import { Request } from "express";
import { ObjectId } from "mongodb";
import { ApiResponse } from "./types";

/**
 * Kiểm tra xác thực Bearer token
 */
export function validateAuthorization(req: Request): boolean {
  const authHeader = req.headers.authorization;
  const authToken = process.env.AUTH_TOKEN;
  
  if (!authToken) {
    console.warn("AUTH_TOKEN not set in environment variables");
    return false;
  }
  
  return authHeader === `Bearer ${authToken}`;
}

/**
 * Hàm gộp sâu các object (deep merge) để tối ưu việc lưu trữ
 * Thay vì lưu toàn bộ object, chỉ cập nhật những trường thay đổi
 */
export function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Kiểm tra xem một giá trị có phải là object không
 */
export function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Kiểm tra ID hợp lệ
 */
export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

/**
 * Tạo response chuẩn
 */
export function createResponse<T = any>(
  status: "success" | "error", 
  message: string, 
  data?: T, 
  statusCode: number = 200
): { body: ApiResponse<T>, statusCode: number } {
  return {
    body: {
      status,
      message,
      ...(data !== undefined ? { data } : {})
    },
    statusCode
  };
}

/**
 * Loại bỏ các trường không cần thiết trước khi lưu vào DB
 * để giảm kích thước lưu trữ
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Bỏ qua các trường có giá trị undefined hoặc null
    if (value === undefined || value === null) {
      continue;
    }
    
    // Xử lý đệ quy nếu là object
    if (isObject(value)) {
      const sanitized = sanitizeObject(value);
      if (Object.keys(sanitized).length > 0) {
        result[key] = sanitized;
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Tạo operation xóa các trường null hoặc undefined trong MongoDB
 * Trả về update operation để sử dụng với $unset
 */
export function createUnsetOperation(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const unsetOps: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (value === null || value === undefined) {
      // Nếu giá trị là null hoặc undefined, thêm vào danh sách để xóa
      unsetOps[fieldPath] = '';
    } else if (isObject(value)) {
      // Nếu là object, xử lý đệ quy
      const nestedUnset = createUnsetOperation(value, fieldPath);
      Object.assign(unsetOps, nestedUnset);
    }
  }
  
  return unsetOps;
} 