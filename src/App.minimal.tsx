import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple test component
function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎉 Alumni Connect Platform Test</h1>
      <p>If you can see this, the app is loading correctly!</p>
      <div style={{ marginTop: '20px' }}>
        <p>✅ React is working</p>
        <p>✅ Routing is working</p>
        <p>✅ No initialization errors</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;