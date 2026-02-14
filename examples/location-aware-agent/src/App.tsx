import "./App.css";
import getMapInstance, { getPinnedLocation } from "@core/wayfinder";
import { ChatDrawer } from "./components/ChatDrawer";

// location-aware-agent requires a pinned location — crash at startup if not configured
const pinnedLocation = getPinnedLocation();
if (!pinnedLocation) {
  throw new Error(
    "Location Aware mode requires a pinned location. Set VITE_PINNED_LATITUDE, VITE_PINNED_LONGITUDE, and VITE_PINNED_FLOOR_ID environment variables.",
  );
}

function App() {
  return (
    <div className="app-container">
      <div className="map-container">
        <div id="map"></div>
      </div>
      <ChatDrawer />
    </div>
  );
}

// this instantiates the map in the background on App mount
getMapInstance();

export default App;
