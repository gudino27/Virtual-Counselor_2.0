import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DegreePlanner from './components/DegreePlanner';
import CoursePlanner from './components/CoursePlanner';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('planner');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'planner' && <DegreePlanner />}
        {activeTab === 'search' && <CoursePlanner />}
      </main>
    </div>
  );
}

export default App;
