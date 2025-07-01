import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { 
  validateAuthorization, 
  createResponse, 
  deepMerge, 
  isValidObjectId,
  sanitizeObject,
  createUnsetOperation
} from "../utils/helpers";
import { AccountData, AccountDocument } from "../utils/types";

// Lấy collection với biến cache để tránh truy vấn lặp lại
const getCollection = async () => {
  const db = await getDb();
  return db.collection("AccountStorage");
};

/**
 * Lấy giá trị dựa trên account và project
 */
export const getValues = async (req: Request, res: Response) => {
  // Kiểm tra xác thực
  if (!validateAuthorization(req)) {
    const { body, statusCode } = createResponse(
      "error",
      "Unauthorized",
      undefined,
      401
    );
    return res.status(statusCode).json(body);
  }

  try {
    const { account, project } = req.query;

    // Validate query params
    if (!account || !project) {
      const { body, statusCode } = createResponse(
        "error",
        "Missing required parameters: account and project",
        undefined,
        400
      );
      return res.status(statusCode).json(body);
    }

    const collection = await getCollection();
    
    // Tạo projection để chỉ lấy các trường cần thiết
    const values = await collection.findOne<AccountDocument>(
      { account, project },
      { projection: { _id: 1, account: 1, project: 1, values: 1 } }
    );

    if (!values) {
      // Trả về object rỗng nếu không tìm thấy dữ liệu
      const { body, statusCode } = createResponse(
        "success",
        "Values retrieved successfully",
        {
          account: String(account),
          project: String(project),
          values: {},
        }
      );
      return res.status(statusCode).json(body);
    }

    const { _id, ...data } = values;
    
    const { body, statusCode } = createResponse(
      "success",
      "Values retrieved successfully",
      data
    );
    
    return res.status(statusCode).json(body);
  } catch (error) {
    console.error("Error fetching values:", error);
    
    const { body, statusCode } = createResponse(
      "error",
      "Failed to retrieve values",
      undefined,
      500
    );
    
    return res.status(statusCode).json(body);
  }
};

/**
 * Thêm hoặc cập nhật giá trị
 */
export const saveValues = async (req: Request, res: Response) => {
  // Kiểm tra xác thực
  if (!validateAuthorization(req)) {
    const { body, statusCode } = createResponse(
      "error",
      "Unauthorized",
      undefined,
      401
    );
    return res.status(statusCode).json(body);
  }

  try {
    const { account, project, values } = req.body as AccountData;

    // Validate body
    if (!account || !project || !values) {
      const { body, statusCode } = createResponse(
        "error",
        "Missing required fields: account, project, or values",
        undefined,
        400
      );
      return res.status(statusCode).json(body);
    }

    const collection = await getCollection();
    
    // Tối ưu: Làm sạch dữ liệu trước khi lưu
    const sanitizedValues = sanitizeObject(values);

    // Tạo operation để xóa các trường null/undefined
    const unsetOperations = createUnsetOperation(values, 'values');

    // Kiểm tra document có tồn tại
    const existingDoc = await collection.findOne(
      { account, project },
      { projection: { _id: 1, values: 1 } }
    );

    if (existingDoc) {
      // Tối ưu: Sử dụng deep merge để chỉ cập nhật các trường thay đổi
      const updatedValues = deepMerge(existingDoc.values || {}, sanitizedValues);
      
      const updateOperations: { 
        $set: { values: any; updatedAt: Date; };
        $unset?: Record<string, any>;
      } = {
        $set: {
          values: updatedValues,
          updatedAt: new Date(),
        }
      };

      // Thêm $unset nếu có trường cần xóa
      if (Object.keys(unsetOperations).length > 0) {
        updateOperations.$unset = unsetOperations;
      }

      const result = await collection.updateOne(
        { _id: existingDoc._id },
        updateOperations
      );

      if (result.acknowledged) {
        const { body, statusCode } = createResponse(
          "success",
          "Values updated successfully",
          {
            account,
            project,
            values: updatedValues,
          }
        );
        return res.status(statusCode).json(body);
      } else {
        throw new Error("Failed to update document");
      }
    } else {
      // Tạo document mới nếu chưa tồn tại
      const document = {
        account,
        project,
        values: sanitizedValues,
        createdAt: new Date(),
      };

      const result = await collection.insertOne(document);

      if (result.acknowledged) {
        const { body, statusCode } = createResponse(
          "success",
          "Values saved successfully",
          {
            account,
            project,
            values: sanitizedValues,
          }
        );
        return res.status(statusCode).json(body);
      } else {
        throw new Error("Failed to insert document");
      }
    }
  } catch (error) {
    console.error("Error saving values:", error);
    
    const { body, statusCode } = createResponse(
      "error",
      "Failed to save values",
      undefined,
      500
    );
    
    return res.status(statusCode).json(body);
  }
};

/**
 * Lấy giá trị dựa trên ID
 */
export const getValueById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      const { body, statusCode } = createResponse(
        "error",
        "Invalid ID format",
        undefined,
        400
      );
      return res.status(statusCode).json(body);
    }

    const collection = await getCollection();
    
    // Tối ưu: Sử dụng projection để chỉ lấy các trường cần thiết
    const value = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { _id: 1, account: 1, project: 1, values: 1 } }
    );

    if (!value) {
      const { body, statusCode } = createResponse(
        "error",
        "Value not found",
        undefined,
        404
      );
      return res.status(statusCode).json(body);
    }

    const { _id, ...rest } = value;
    
    const { body, statusCode } = createResponse(
      "success",
      "Value retrieved successfully",
      { id: _id.toString(), ...rest }
    );
    
    return res.status(statusCode).json(body);
  } catch (error) {
    console.error("Error fetching value by id:", error);
    
    const { body, statusCode } = createResponse(
      "error",
      "Failed to retrieve value",
      undefined,
      500
    );
    
    return res.status(statusCode).json(body);
  }
};

/**
 * Cập nhật giá trị dựa trên ID
 */
export const updateValueById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { values } = req.body;

    if (!id || !isValidObjectId(id)) {
      const { body, statusCode } = createResponse(
        "error",
        "Invalid ID format",
        undefined,
        400
      );
      return res.status(statusCode).json(body);
    }

    const collection = await getCollection();

    // Lấy document hiện tại
    const existingDoc = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { values: 1, account: 1, project: 1 } }
    );

    if (!existingDoc) {
      const { body, statusCode } = createResponse(
        "error",
        "Value not found",
        undefined,
        404
      );
      return res.status(statusCode).json(body);
    }

    // Kiểm tra có trường values
    const hasValues = values !== undefined;
    let updatedValues = existingDoc.values || {};

    if (hasValues) {
      // Tối ưu: Làm sạch dữ liệu và sử dụng deep merge
      const sanitizedValues = sanitizeObject(values);
      updatedValues = deepMerge(updatedValues, sanitizedValues);
      
      // Tạo operation để xóa các trường null/undefined
      const unsetOperations = createUnsetOperation(values, 'values');
      
      // Xây dựng update operation
      const updateOperations: { 
        $set: { values: any; updatedAt: Date; };
        $unset?: Record<string, any>;
      } = {
        $set: {
          values: updatedValues,
          updatedAt: new Date(),
        }
      };

      // Thêm $unset nếu có trường cần xóa
      if (Object.keys(unsetOperations).length > 0) {
        updateOperations.$unset = unsetOperations;
      }

      // Cập nhật document
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        updateOperations
      );

      if (result.matchedCount === 0) {
        const { body, statusCode } = createResponse(
          "error",
          "Value not found",
          undefined,
          404
        );
        return res.status(statusCode).json(body);
      }

      const { body, statusCode } = createResponse(
        "success",
        "Value updated successfully",
        {
          id,
          account: existingDoc.account,
          project: existingDoc.project,
          values: updatedValues,
        }
      );
      
      return res.status(statusCode).json(body);
    } else {
      const { body, statusCode } = createResponse(
        "error", 
        "No values provided for update", 
        undefined, 
        400
      );
      return res.status(statusCode).json(body);
    }
  } catch (error) {
    console.error("Error updating value:", error);
    
    const { body, statusCode } = createResponse(
      "error",
      "Failed to update value",
      undefined,
      500
    );
    
    return res.status(statusCode).json(body);
  }
};

/**
 * Xóa giá trị dựa trên ID
 */
export const deleteValueById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      const { body, statusCode } = createResponse(
        "error",
        "Invalid ID format",
        undefined,
        400
      );
      return res.status(statusCode).json(body);
    }

    const collection = await getCollection();
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      const { body, statusCode } = createResponse(
        "error",
        "Value not found",
        undefined,
        404
      );
      return res.status(statusCode).json(body);
    }

    const { body, statusCode } = createResponse(
      "success",
      "Value deleted successfully"
    );
    
    return res.status(statusCode).json(body);
  } catch (error) {
    console.error("Error deleting value:", error);
    
    const { body, statusCode } = createResponse(
      "error",
      "Failed to delete value",
      undefined,
      500
    );
    
    return res.status(statusCode).json(body);
  }
}; 