export function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">CourtForge GM</h1>
        <p className="text-muted-foreground">
          Basketball Franchise Simulator
        </p>
        <div className="pt-4">
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            New League
          </button>
        </div>
      </div>
    </div>
  )
}
