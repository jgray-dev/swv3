export default function MapSuspense() {
  return (
    <div className="w-screen">
      <div className="w-full min-h-[20vh] mt-24 text-center">
        <div className="select-none translate-y-6">
          <div className="h-6 w-48 rounded mx-auto animate-pulse" />
        </div>
        <div className="min-h-[234px]" />
      </div>
      <div className="max-w-screen min-h-screen p-4 flex md:flex-row flex-col gap-4">
        <div className="w-full md:w-3/4 h-[500px] md:h-[800px] rounded-lg overflow-hidden shadow-lg mx-auto bg-gray-800 animate-pulse" />
        <div className="w-0 duration-300" />
      </div>
    </div>
  );
}
