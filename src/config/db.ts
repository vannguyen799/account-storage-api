import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please set MONGODB_URI environment variable");
}

// Tối ưu hóa kết nối MongoDB
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10, // Giới hạn kết nối tối đa
  minPoolSize: 5,  // Duy trì số kết nối tối thiểu
  connectTimeoutMS: 5000, // Thời gian timeout kết nối
  socketTimeoutMS: 30000, // Thời gian timeout socket
  // Sử dụng nén dữ liệu để giảm dung lượng truyền tải
  compressors: "zlib",
};

const client = new MongoClient(uri, options);

let clientPromise: Promise<MongoClient>;

// Tối ưu hóa kết nối để tránh tạo nhiều kết nối không cần thiết
if (process.env.NODE_ENV === "development") {
  // Sử dụng biến toàn cục để giữ kết nối trong môi trường dev
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = client.connect();
}

// Tạo indexes để tối ưu hóa truy vấn
export async function createIndexes() {
  try {
    const db = await getDb();
    const collection = db.collection("AccountStorage");
    
    // Kiểm tra và gộp dữ liệu trùng lặp trước khi tạo unique index
    const duplicateGroups = await collection.aggregate([
      {
        $group: {
          _id: { account: "$account", project: "$project" },
          ids: { $push: "$_id" },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    // Xử lý dữ liệu trùng lặp
    if (duplicateGroups.length > 0) {
      console.log(`Found ${duplicateGroups.length} groups of duplicate account:project pairs`);
      
      for (const group of duplicateGroups) {
        const { _id, ids } = group;
        console.log(`Merging duplicate entries for account:${_id.account}, project:${_id.project}`);
        
        // Lấy tất cả documents trùng lặp
        const duplicateDocs = await collection.find({
          account: _id.account,
          project: _id.project
        }).toArray();
        
        if (duplicateDocs.length > 1) {
          // Giữ lại document đầu tiên
          const primaryDoc = duplicateDocs[0];
          
          // Gộp dữ liệu từ các documents khác
          for (let i = 1; i < duplicateDocs.length; i++) {
            const doc = duplicateDocs[i];
            
            // Gộp values từ document hiện tại vào primary
            if (doc.values && typeof doc.values === 'object') {
              primaryDoc.values = { ...primaryDoc.values, ...doc.values };
            }
            
            // Xóa document đã gộp
            await collection.deleteOne({ _id: doc._id });
          }
          
          // Cập nhật document chính với dữ liệu đã gộp và ngày cập nhật
          await collection.updateOne(
            { _id: primaryDoc._id },
            { 
              $set: {
                values: primaryDoc.values,
                updatedAt: new Date()
              } 
            }
          );
          
          console.log(`Merged ${duplicateDocs.length} entries into one for ${_id.account}:${_id.project}`);
        }
      }
    }
    
    // Index cho cặp account-project để tăng tốc truy vấn
    await collection.createIndex(
      { account: 1, project: 1 }, 
      { unique: true, background: true }
    );
    
    // Index cho trường updatedAt để có thể truy vấn theo thời gian cập nhật
    await collection.createIndex({ updatedAt: -1 });
    
    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating database indexes:", error);
  }
}

export { clientPromise };

// Hàm để lấy DB instance
export async function getDb(dbName: string = "AccountStorage") {
  const client = await clientPromise;
  return client.db(dbName);
}

// Hàm đóng kết nối khi không sử dụng
export async function closeConnection() {
  const client = await clientPromise;
  await client.close();
} 