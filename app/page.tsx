import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>API</CardTitle>
          <CardDescription>API endpoints for storing and retrieving account values</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">POST /api/values</h3>
            <p className="text-sm text-muted-foreground">Save account values to MongoDB</p>
          </div>
          <div>
            <h3 className="font-medium">GET /api/values?account=X&project=Y</h3>
            <p className="text-sm text-muted-foreground">Retrieve account values from MongoDB</p>
          </div>
          {/* <div>
            <h3 className="font-medium">GET /api/values/[id]</h3>
            <p className="text-sm text-muted-foreground">Get a specific value by ID</p>
          </div>
          <div>
            <h3 className="font-medium">PUT /api/values/[id]</h3>
            <p className="text-sm text-muted-foreground">Update a specific value</p>
          </div>
          <div>
            <h3 className="font-medium">DELETE /api/values/[id]</h3>
            <p className="text-sm text-muted-foreground">Delete a specific value</p>
          </div> */}
        </CardContent>
      </Card>
    </main>
  )
}
