import React from 'react';

function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="bg-wsu-crimson shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* VC Logo */}
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
              <span className="text-wsu-crimson font-bold text-xl">VC</span>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-white">Virtual Counselor</h1>
              <p className="text-xs text-gray-200">Washington State University</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'planner'
                  ? 'bg-white text-wsu-crimson shadow-md'
                  : 'text-white hover:bg-red-800'
              }`}
            >
              Degree Planner
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-white text-wsu-crimson shadow-md'
                  : 'text-white hover:bg-red-800'
              }`}
            >
              Course Planner
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
