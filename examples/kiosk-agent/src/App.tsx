import "./App.css";
import getMapInstance from "@core/wayfinder";
import { ChatDrawer } from "./components/ChatDrawer";

function App() {
  return (
    <div className="app-container">
      <ChatDrawer />
    </div>
  );
}

// this instantiates the map in the background on App mount
getMapInstance({ headless: true });

export default App;
