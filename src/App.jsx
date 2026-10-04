import TwentyThreeFour from "./components/ui/day-picker";

export default function App() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-background text-foreground p-8">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Day Picker</h1>
          <p className="text-sm text-muted-foreground">
            Interactive animated frequency and weekday selector
          </p>
        </div>

        <div className="w-full flex justify-center py-6">
          <TwentyThreeFour />
        </div>
      </div>
    </div>
  );
}
