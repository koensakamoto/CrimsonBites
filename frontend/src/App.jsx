import React, { lazy, Suspense } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import HomeLayout from './components/HomeLayout'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import NutrientTracker from './components/NutrientTracker'
import Register from './components/Register'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import AuthCallback from './components/AuthCallback'
import PrivacyPolicy from './components/PrivacyPolicy'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './AuthProvider'

// Lazy load heavy route components
const ProfileSettings = lazy(() => import('./components/ProfileSettings/ProfileSettings'))
const NutritionHistory = lazy(() => import('./components/nutritionHistory/NutritionHistory'))
const UserAccount = lazy(() => import('./components/accountPage/UserAccount'))

// Utility to get local date string in YYYY-MM-DD format
function getLocalDateString(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

// Add a PrivateRoute component for authenticated, non-guest users
function PrivateRoute({ children }) {
  const { user, loading, error } = useAuth(); 

  if(loading){
    return <div>Loading...</div>;
  }

  if (!user || user.guest) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { user, logout } = useAuth();
  const [trackedItems, setTrackedItems] = React.useState([])
  const [date, setDate] = React.useState(new Date())

  // Dashboard filter state - lifted here to persist across navigation
  const [diningHall, setDiningHall] = React.useState("")
  const [mealType, setMealType] = React.useState("")
  const [foodStations, setFoodStations] = React.useState([])
  const [diningHalls, setDiningHalls] = React.useState([])
  const [mealTypesByHall, setMealTypesByHall] = React.useState({})
  // Track what params the cached foodStations is for
  const [cachedFoodParams, setCachedFoodParams] = React.useState(null)
  // Track which date's plate has been loaded to avoid refetching on navigation
  const [cachedPlateDate, setCachedPlateDate] = React.useState(null)

  // Nutrition history cache - persists across navigation, refreshes on plate save
  const [nutritionHistoryCache, setNutritionHistoryCache] = React.useState(null)
  const [nutritionHistoryVersion, setNutritionHistoryVersion] = React.useState(0)
  
  const addToTracker = (item, quantity = 1) => {
    const newItem = {
      ...item,
      quantity: quantity,
      uniqueId: crypto.randomUUID()
    };
    setTrackedItems((prev) => [...prev, newItem]);
  }

  const removeFromTracker = (itemId) => {
    setTrackedItems(prev => prev.filter(item => item.uniqueId !== itemId));
  };

  const clearTracker = () => {
    setTrackedItems([])
  }

  const handleSavePlate = async () => {
    const plateItems = trackedItems.map(item => {

      const foodId = item.id || item._id;
      const isCustom = String(foodId).startsWith('custom-');
      const base = {
        food_id: foodId,
        quantity: item.quantity || 1
      };
      if (isCustom) {
        base.custom_macros = {
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          totalFat: item.totalFat,
          name: item.name
        };
      }
      return base;
    });
    const res = await fetch('/api/plate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        date: getLocalDateString(date),
        items: plateItems
      })
    });
    if (res.ok) {
      // Invalidate nutrition history cache so it refetches on next visit
      setNutritionHistoryVersion(v => v + 1)
    } else {
      console.error('Failed to save plate');
    }
  }

  return (
    <>
      <Routes>
        {/* Standalone Authentication Routes (no header) */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" /> : <Register />} 
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />} 
        />
        <Route 
          path="/reset-password" 
          element={user ? <Navigate to="/dashboard" /> : <ResetPassword />} 
        />
        <Route 
          path="/auth/callback" 
          element={<AuthCallback />} 
        />
        <Route
          path="/privacy"
          element={<PrivacyPolicy />}
        />

        {/* Main App Routes (with header layout) */}
        <Route 
          path="/" 
          element={<HomeLayout isLoggedIn={!!user} onLogout={logout} />}
        >
          <Route index element={<Navigate to={user ? 'dashboard' : 'login'} />} />
          <Route
            path="dashboard"
            element={
              <div className="flex flex-col lg:flex-row w-full flex-grow p-2 sm:p-4 gap-2 sm:gap-4">
                <Dashboard
                  addToTracker={addToTracker}
                  trackedItems={trackedItems}
                  setTrackedItems={setTrackedItems}
                  removeItem={removeFromTracker}
                  clearItems={clearTracker}
                  date={date}
                  setDate={setDate}
                  onSavePlate={handleSavePlate}
                  diningHall={diningHall}
                  setDiningHall={setDiningHall}
                  mealType={mealType}
                  setMealType={setMealType}
                  foodStations={foodStations}
                  setFoodStations={setFoodStations}
                  diningHalls={diningHalls}
                  setDiningHalls={setDiningHalls}
                  mealTypesByHall={mealTypesByHall}
                  setMealTypesByHall={setMealTypesByHall}
                  cachedFoodParams={cachedFoodParams}
                  setCachedFoodParams={setCachedFoodParams}
                  cachedPlateDate={cachedPlateDate}
                  setCachedPlateDate={setCachedPlateDate}
                />
                <div className="hidden lg:block lg:w-1/4">
                  <NutrientTracker
                    trackedItems={trackedItems}
                    removeItem={removeFromTracker}
                    clearItems={clearTracker}
                    selectedDate={getLocalDateString(date)}
                    onSavePlate={handleSavePlate}
                  />
                </div>
              </div>
            }
          />
          
          <Route path="profile" element={<PrivateRoute><Suspense fallback={<LoadingSpinner />}><ProfileSettings /></Suspense></PrivateRoute>} />
          <Route path="account" element={<PrivateRoute><Suspense fallback={<LoadingSpinner />}><UserAccount /></Suspense></PrivateRoute>} />
          <Route path="history" element={<PrivateRoute><Suspense fallback={<LoadingSpinner />}><NutritionHistory cache={nutritionHistoryCache} setCache={setNutritionHistoryCache} version={nutritionHistoryVersion} /></Suspense></PrivateRoute>} />
          {/* <Route path="ai-meal-planner" element={<PrivateRoute><AIMealPlanner /></PrivateRoute>} /> */}
          <Route
            path="*"
            element={<Navigate to="/" />}
          />
        </Route>
      </Routes>
    </>
  )
}