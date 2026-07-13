import { BrowserRouter, Routes, Route } from "react-router-dom";
import TODO from "./pages/todo.jsx";
import Signup from "./pages/signup.jsx";
import Login from "./pages/login.jsx";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/todo" element={<TODO />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App
