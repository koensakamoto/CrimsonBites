import React, {useState, useEffect} from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { ProfileInfoTooltip } from './ProfileInfoTooltip';
import { useAuth } from '../../AuthProvider';

const commonAllergens = [
  { id: 'milk', label: 'Dairy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'fish', label: 'Fish' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'tree_nuts', label: 'Tree Nuts' },
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'soybeans', label: 'Soy' },
];
const otherSensitivities = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'lactose', label: 'Lactose' },
];

export const AllergensSection = () => {
  const { user, updateUserProfile } = useAuth();
  const cachedProfile = user?.profile;

  const [selectedAllergens, setSelectedAllergens] = useState(cachedProfile?.allergens || []);
  const [originalAllergens, setOriginalAllergens] = useState(cachedProfile?.allergens || []);
  const [selectedSensitivities, setSelectedSensitivities] = useState(cachedProfile?.food_sensitivities || []);
  const [originalSensitivities, setOriginalSensitivities] = useState(cachedProfile?.food_sensitivities || []);
  const [allergyNotes, setAllergyNotes] = useState(cachedProfile?.allergy_notes || "");
  const [originalNotes, setOriginalNotes] = useState(cachedProfile?.allergy_notes || "");
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Sync with cached profile when it changes
  useEffect(() => {
    if (cachedProfile) {
      const allergens = cachedProfile.allergens || [];
      const sensitivities = cachedProfile.food_sensitivities || [];
      const notes = cachedProfile.allergy_notes || "";
      setSelectedAllergens(allergens);
      setOriginalAllergens(allergens);
      setSelectedSensitivities(sensitivities);
      setOriginalSensitivities(sensitivities);
      setAllergyNotes(notes);
      setOriginalNotes(notes);
    }
  }, [cachedProfile]);

  // Helper to compare arrays with normalization
  const normalizeArray = arr => arr.map(String).map(s => s.trim()).sort();
  const arraysEqual = (a, b) => {
    const aNorm = normalizeArray(a);
    const bNorm = normalizeArray(b);
    if (aNorm.length !== bNorm.length) return false;
    return aNorm.every((val, idx) => val === bNorm[idx]);
  };

  const handleAllergenChange = (e) => {
    const allergen = e.target.value;
    let updated;
    if (e.target.checked) {
      updated = [...selectedAllergens, allergen];
    } else {
      updated = selectedAllergens.filter(a => a !== allergen);
    }
    setSelectedAllergens(updated);
    setShowSaveButton(
      !arraysEqual(updated, originalAllergens) ||
      !arraysEqual(selectedSensitivities, originalSensitivities) ||
      allergyNotes !== originalNotes
    );
    setSaveSuccess(false);
  };

  const handleSensitivityChange = (e) => {
    const sensitivity = e.target.value;
    let updated;
    if (e.target.checked) {
      updated = [...selectedSensitivities, sensitivity];
    } else {
      updated = selectedSensitivities.filter(a => a !== sensitivity);
    }
    setSelectedSensitivities(updated);
    setShowSaveButton(
      !arraysEqual(selectedAllergens, originalAllergens) ||
      !arraysEqual(updated, originalSensitivities) ||
      allergyNotes !== originalNotes
    );
    setSaveSuccess(false);
  };

  const handleNotesChange = (e) => {
    const notes = e.target.value;
    setAllergyNotes(notes);
    setShowSaveButton(
      !arraysEqual(selectedAllergens, originalAllergens) ||
      !arraysEqual(selectedSensitivities, originalSensitivities) ||
      notes !== originalNotes
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
          allergens: selectedAllergens,
          food_sensitivities: selectedSensitivities,
          allergy_notes: allergyNotes
        })
      });
      if (!res.ok) throw new Error('Failed to update sensitivities');
      setOriginalAllergens(selectedAllergens);
      setOriginalSensitivities(selectedSensitivities);
      setOriginalNotes(allergyNotes);
      setShowSaveButton(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setSaveSuccess(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">Allergens</h2>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none"
            onClick={() => setShowTooltip(true)}
            aria-label="Show allergens info"
          >
            <Info size={18} />
          </button>
        </div>
      </div>
      <ProfileInfoTooltip
        isOpen={showTooltip}
        onClose={() => setShowTooltip(false)}
        section="allergens"
      />
      <div className="border border-orange-200 rounded-xl p-4 mb-6 bg-orange-50/30">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle className="h-5 w-5 text-orange-500" strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">
              For severe allergies, notify dining staff directly.
            </p>
          </div>
        </div>
      </div>
      <p className="text-gray-600 mb-6">
        Select allergies or intolerances to flag unsafe foods.
      </p>
      {fetchError && (
        <div className="text-red-600 mb-4">{fetchError}</div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-800 mb-3">Common Allergens</h3>
            <div className="space-y-3">
              {commonAllergens.map(option => (
                <label key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-[#c41e3a] rounded"
                    value={option.id}
                    checked={selectedAllergens.includes(option.id)}
                    onChange={handleAllergenChange}
                  />
                  <span className="ml-2">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-3">Other Food Sensitivities</h3>
            <div className="space-y-3">
              {otherSensitivities.map(option => (
                <label key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-[#c41e3a] rounded"
                    value={option.id}
                    checked={selectedSensitivities.includes(option.id)}
                    onChange={handleSensitivityChange}
                  />
                  <span className="ml-2">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-gray-700 font-medium mb-2">Additional Allergies or Notes</label>
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="List any other food allergies or special considerations..."
            value={allergyNotes}
            onChange={handleNotesChange}
          ></textarea>
        </div>
        <div className="flex justify-end mt-4">
          {showSaveButton && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              onClick={handleSave}
            >
              Save Allergen Information
            </button>
          )}
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 mt-3">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span className="text-sm">Allergen information saved successfully</span>
          </div>
        )}
      </div>
    </div>
  );
};
