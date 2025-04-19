import { type NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// Types
type AccountValue = {
  [key: string]: any;
};

type AccountData = {
  account: string;
  project: string;
  values: AccountValue;
};
type AccountDocument = {
  _id: string;
} & AccountData;

type PostResponse = {
  status: string;
  message: string;
  data: AccountValue;
};

type GetData = {
  account: string;
  project: string;
};

type GetResponse = {
  status: string;
  message: string;
  data: AccountData;
};

// MongoDB connection
const uri = process.env.MONGODB_URI;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

const AUTH_TOKEN = process.env.AUTH_TOKEN;

function validateAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  return authHeader === `Bearer ${AUTH_TOKEN}`;
}

// GET handler
export async function GET(request: NextRequest) {
  if (!validateAuthorization(request)) {
    return NextResponse.json(
      {
        status: "error",
        message: "Unauthorized",
        data: {},
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get("account");
    const project = searchParams.get("project");

    if (!account || !project) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameters: account and project",
          data: {},
        } as GetResponse,
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("AccountStorage");
    const collection = db.collection("AccountStorage");

    const values = await collection.findOne<AccountDocument>({ account, project });
    if (!values) {
      return NextResponse.json({
        status: "success",
        message: "Values retrieved successfully",
        data: {
          account,
          project,
          values: {},
        },
      });
    }

    const { _id, ...res } = values;
    const response: GetResponse = {
      status: "success",
      message: "Values retrieved successfully",
      data: res,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching values:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve values",
        data: {},
      } as GetResponse,
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  if (!validateAuthorization(request)) {
    return NextResponse.json(
      {
        status: "error",
        message: "Unauthorized",
        data: {},
      },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as AccountData;
    const { account, project, values } = body;

    if (!account || !project || !values) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required fields: account, project, or values",
          data: {},
        } as PostResponse,
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("AccountStorage");
    const collection = db.collection("AccountStorage");

    // Check if a document with the same account and project already exists
    const existingDoc = await collection.findOne({ account, project });

    if (existingDoc) {
      // If document exists, merge the values
      const updatedValues = {
        ...existingDoc.values,
        ...values,
      };

      const result = await collection.updateOne(
        { _id: existingDoc._id },
        {
          $set: {
            values: updatedValues,
            updatedAt: new Date(),
          },
        }
      );

      if (result.acknowledged) {
        const response: PostResponse = {
          status: "success",
          message: "Values updated successfully",
          data: {
            ...existingDoc,
            values: updatedValues,
            _id: undefined,
          },
        };
        return NextResponse.json(response);
      } else {
        throw new Error("Failed to update document");
      }
    } else {
      // If document doesn't exist, create a new one
      const document = {
        account,
        project,
        values,
        createdAt: new Date(),
      };

      const result = await collection.insertOne(document);

      if (result.acknowledged) {
        const response: PostResponse = {
          status: "success",
          message: "Values saved successfully",
          data: {
            ...document,
            _id: undefined,
          },
        };
        return NextResponse.json(response);
      } else {
        throw new Error("Failed to insert document");
      }
    }
  } catch (error) {
    console.error("Error saving values:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to save values",
        data: {},
      } as PostResponse,
      { status: 500 }
    );
  }
}
