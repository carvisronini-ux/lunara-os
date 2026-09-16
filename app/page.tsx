export default function Home() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col gap-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-lunara-gold">
            LUNARA OS
          </h1>
          <p className="text-xl text-lunara-purple-light">
            Foundation v1.0.0 — Successfully Initialized
          </p>
          <div className="mt-8 p-6 border border-lunara-purple/30 rounded-lg bg-lunara-dark/50 backdrop-blur">
            <p className="text-gray-300 mb-4">
              The autonomous operating organization is ready.
            </p>
            <div className="flex gap-4 justify-center text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                Core Architecture: Locked
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse"></span>
                Next.js Runtime: Active
              </span>
            </div>
          </div>
        </div>
      </main>
    )
  }