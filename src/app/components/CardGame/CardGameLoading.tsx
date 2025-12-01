export default function CardGameLoading() {
  return (
    <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-xl font-bold mb-4">Loading Card Game...</h2>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
        <p className="text-sm text-gray-400 mt-4">
          Connecting to game server...
        </p>
      </div>
    </div>
  )
}