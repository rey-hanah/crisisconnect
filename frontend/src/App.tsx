import Navbar from "./components/ui/Navbar"
import LandingPage from "./components/LandingPage"

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <LandingPage />
    </div>
  )
}

