import "./App.css";
import getMapInstance from "@core/wayfinder";
import { ChatDrawer } from "./components/ChatDrawer";

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
