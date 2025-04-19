import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

// MongoDB connection
const uri = process.env.MONGODB_URI
let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

// Deep merge function to merge objects
function deepMerge(target: any, source: any) {
  const output = { ...target }

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] })
        } else {
          output[key] = deepMerge(target[key], source[key])
        }
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }

  return output
}

function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item)
}

// GET a specific value by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid ID format",
          data: {},
        },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db("AccountStorage")
    const collection = db.collection("AccountStorage")

    const value = await collection.findOne({ _id: new ObjectId(id) })

    if (!value) {
      return NextResponse.json(
        {
          status: "error",
          message: "Value not found",
          data: {},
        },
        { status: 404 },
      )
    }

    const { _id, ...rest } = value

    return NextResponse.json({
      status: "success",
      message: "Value retrieved successfully",
      data: { id: _id.toString(), ...rest },
    })
  } catch (error) {
    console.error("Error fetching value:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve value",
        data: {},
      },
      { status: 500 },
    )
  }
}

// PUT to update a specific value
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid ID format",
          data: {},
        },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db("AccountStorage")
    const collection = db.collection("AccountStorage")

    // First, get the existing document
    const existingDoc = await collection.findOne({ _id: new ObjectId(id) })

    if (!existingDoc) {
      return NextResponse.json(
        {
          status: "error",
          message: "Value not found",
          data: {},
        },
        { status: 404 },
      )
    }

    // Check if the body contains a values property
    const hasValues = "values" in body
    let updatedValues = existingDoc.values || {}

    if (hasValues) {
      // Merge the new values with existing values
      updatedValues = deepMerge(updatedValues, body.values)
    }

    // Prepare the update
    const update = {
      $set: {
        values: updatedValues,
        updatedAt: new Date(),
      },
    }

    const result = await collection.updateOne({ _id: new ObjectId(id) }, update)

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Value not found",
          data: {},
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Value updated successfully",
      data: {
        id,
        account: existingDoc.account,
        project: existingDoc.project,
        values: updatedValues,
      },
    })
  } catch (error) {
    console.error("Error updating value:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update value",
        data: {},
      },
      { status: 500 },
    )
  }
}

// DELETE a specific value
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid ID format",
        },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db("AccountStorage")
    const collection = db.collection("AccountStorage")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Value not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Value deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting value:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to delete value",
      },
      { status: 500 },
    )
  }
}
