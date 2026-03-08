import Navbar from "./components/ui/Navbar"
import MapPage from "./components/MapPage"

export default function App() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <MapPage />
    </div>
  )
}
