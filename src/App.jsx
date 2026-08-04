import { useState } from "react";
import MainLayout from "./layouts";
import { SplashScreen } from "./components/SplashScreen/SplashScreen";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return showSplash ? (
    <SplashScreen onComplete={() => setShowSplash(false)} />
  ) : (
    <MainLayout />
  );
}

export default App;