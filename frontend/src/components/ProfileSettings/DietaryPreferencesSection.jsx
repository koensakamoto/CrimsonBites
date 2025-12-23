import React, { useState, useEffect } from 'react';
import { Info, Utensils, CheckCircle2 } from 'lucide-react';
import { ProfileInfoTooltip } from './ProfileInfoTooltip';
import { useAuth } from '../../AuthProvider';

const mealPreferenceOptions = [
  "Low Sodium", "Low Sugar", "High Protein", "High Fiber", "Gluten-Free", "Dairy-Free"
];

const dietTypes = [
  { value: "regular", label: "Regular (No Restrictions)" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Ketogenic" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "low-carb", label: "Low Carb" }
];

export const DietaryPreferencesSection = () => {
  const { user, updateUserProfile } = useAuth();
  const cachedProfile = user?.profile;

  const [dietType, setDietType] = useState(cachedProfile?.diet_type || "regular");
  const [mealPreferences, setMealPreferences] = useState(cachedProfile?.meal_preference || []);
  const [original, setOriginal] = useState({
    dietType: cachedProfile?.diet_type || "regular",
    mealPreferences: cachedProfile?.meal_preference || []
  });
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Sync with cached profile when it changes
  useEffect(() => {
    if (cachedProfile) {
      setDietType(cachedProfile.diet_type || "regular");
      setMealPreferences(cachedProfile.meal_preference || []);
      setOriginal({
        dietType: cachedProfile.diet_type || "regular",
        mealPreferences: cachedProfile.meal_preference || []
      });
    }
  }, [cachedProfile]);

  const handleDietTypeChange = (e) => {
    setDietType(e.target.value);
    setShowSaveButton(
      e.target.value !== original.dietType ||
      JSON.stringify(mealPreferences) !== JSON.stringify(original.mealPreferences)
    );
    setSaveSuccess(false);
  };

  const handleMealPreferenceChange = (e) => {
    const value = e.target.value;
    let updated;
    if (e.target.checked) {
      updated = [...mealPreferences, value];
    } else {
      updated = mealPreferences.filter(p => p !== value);
    }
    setMealPreferences(updated);
    setShowSaveButton(
      dietType !== original.dietType ||
      JSON.stringify(updated) !== JSON.stringify(original.mealPreferences)
    );
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          diet_type: dietType,
          meal_preference: mealPreferences
        })
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      setOriginal({
        dietType,
        mealPreferences
      });
      setShowSaveButton(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveSuccess(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">Dietary Preferences</h2>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none"
            onClick={() => setShowTooltip(true)}
            aria-label="Show dietary preferences info"
          >
            <Info size={18} />
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-6">
        Set your dietary preferences to help us customize your meal recommendations.
      </p>
      {fetchError && (
        <div className="text-red-600 mb-4">{fetchError}</div>
      )}
      <div className="space-y-6">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Diet Type</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={dietType}
            onChange={handleDietTypeChange}
          >
            {dietTypes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Meal Preferences</label>
          <div className="grid grid-cols-2 gap-3">
            {mealPreferenceOptions.map(opt => (
              <label key={opt} className="flex items-center bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  value={opt}
                  checked={mealPreferences.includes(opt)}
                  onChange={handleMealPreferenceChange}
                />
                <span className="ml-2">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg flex items-center">
          <Utensils size={24} className="text-blue-600 mr-3" />
          <div>
            <div className="font-medium text-gray-800">Your meal plans will be customized based on these preferences</div>
            <p className="text-sm text-gray-600">You can update these settings any time</p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          {showSaveButton && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              onClick={handleSave}
            >
              Save Preferences
            </button>
          )}
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 mt-3">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span className="text-sm">Preferences saved successfully</span>
          </div>
        )}
      </div>
      <ProfileInfoTooltip
        isOpen={showTooltip}
        onClose={() => setShowTooltip(false)}
        section="dietary"
      />
    </div>
  );
};
