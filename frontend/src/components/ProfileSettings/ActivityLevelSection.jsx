import React, { useState, useEffect } from 'react';
import { Activity, Info, CheckCircle2 } from 'lucide-react';
import { ProfileInfoTooltip } from './ProfileInfoTooltip';
import { useAuth } from '../../AuthProvider';

const activityLevels = [
  { id: "sedentary", label: "Sedentary", description: "Little to no exercise, desk job", multiplier: 1.2 },
  { id: "light", label: "Lightly Active", description: "Light exercise 1-3 days/week", multiplier: 1.375 },
  { id: "moderate", label: "Moderately Active", description: "Moderate exercise 3-5 days/week", multiplier: 1.55 },
  { id: "high", label: "Very Active", description: "Hard exercise 6-7 days/week", multiplier: 1.725 },
  { id: "extreme", label: "Extremely Active", description: "Very hard exercise, physical job or training twice a day", multiplier: 1.9 },
];

export const ActivityLevelSection = ({ energyTarget, refreshEnergyTarget, triggerProfileRefresh }) => {
  const { user, updateUserProfile } = useAuth();
  const cachedLevel = user?.profile?.activity_level || 'moderate';

  const [selectedLevel, setSelectedLevel] = useState(cachedLevel);
  const [originalLevel, setOriginalLevel] = useState(cachedLevel);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Sync with cached profile when it changes
  useEffect(() => {
    if (user?.profile?.activity_level) {
      const level = user.profile.activity_level;
      setSelectedLevel(level);
      setOriginalLevel(level);
    }
  }, [user?.profile?.activity_level]);

  const handleChange = (e) => {
    const newLevel = e.target.id;
    setShowSaveButton(newLevel !== originalLevel);
    setSaveSuccess(false);
    setSelectedLevel(newLevel);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activity_level: selectedLevel })
      });
      if (!res.ok) throw new Error('Failed to update activity level');
      setOriginalLevel(selectedLevel);
      setShowSaveButton(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      updateUserProfile({ activity_level: selectedLevel });
      if (refreshEnergyTarget) refreshEnergyTarget();
      if (triggerProfileRefresh) triggerProfileRefresh();
      
    } catch (err) {
      console.error(err);
      setSaveSuccess(false);
    }
  };

  const currentMultiplier = activityLevels.find(l => l.id === selectedLevel)?.multiplier ?? 1.55;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">Activity Level</h2>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none"
            onClick={() => setShowTooltip(true)}
            aria-label="Show activity level info"
          >
            <Info size={18} />
          </button>
        </div>
      </div>
      <ProfileInfoTooltip
        isOpen={showTooltip}
        onClose={() => setShowTooltip(false)}
        section="activity"
      />
      <p className="text-gray-600 mb-6">
        Your activity level helps us calculate your daily energy requirements more accurately.
      </p>
      {fetchError && (
        <div className="text-red-600 mb-4">{fetchError}</div>
      )}
      <div className="space-y-4">
        {activityLevels.map((level) => (
          <div key={level.id} className="flex items-start space-x-3">
            <input
              type="radio"
              id={level.id}
              name="activity"
              className="mt-1 form-radio h-4 w-4 text-[#c41e3a]"
              onChange={handleChange}
              checked={selectedLevel === level.id}
            />
            <div>
              <label htmlFor={level.id} className="font-medium text-gray-800 block">
                {level.label}
              </label>
              <p className="text-sm text-gray-600">{level.description}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Save button and success message moved to multiplier card row */}
      <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center bg-gray-50 p-4 rounded-lg">
          <Activity size={24} className="text-[#c41e3a] mr-3" />
          <div>
            <div className="font-medium">Daily activity multiplier: <span className="text-[#c41e3a]">{currentMultiplier}x</span></div>
            <p className="text-sm text-gray-600">This affects your calorie needs calculation</p>
          </div>
        </div>
        {showSaveButton && (
          <button
            onClick={handleSave}
            className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center"
          >
            Save Activity Level
          </button>
        )}
      </div>
      {saveSuccess && (
        <div className="flex items-center gap-2 text-emerald-600 mt-3">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span className="text-sm">Activity level saved successfully</span>
        </div>
      )}
    </div>
  );
}

