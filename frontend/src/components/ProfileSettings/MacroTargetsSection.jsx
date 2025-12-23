import React, { useState, useEffect } from 'react';
import { Info, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { ProfileInfoTooltip } from './ProfileInfoTooltip';
import { useAuth } from '../../AuthProvider';

export const MacroTargetsSection = ({ energyTarget, refreshEnergyTarget, triggerProfileRefresh }) => {
  const { user, updateUserProfile } = useAuth();
  const cachedProfile = user?.profile;

  const [showTooltip, setShowTooltip] = useState(false);
  const [proteinRatio, setProteinRatio] = useState(cachedProfile?.protein_ratio ?? 29);
  const [carbRatio, setCarbRatio] = useState(cachedProfile?.carb_ratio ?? 58);
  const [fatRatio, setFatRatio] = useState(cachedProfile?.fat_ratio ?? 12);
  const baseEnergyTarget = energyTarget;
  const [proteinLocked, setProteinLocked] = useState(false);
  const [carbLocked, setCarbLocked] = useState(false);
  const [fatLocked, setFatLocked] = useState(false);
  const lockedCount = [proteinLocked, carbLocked, fatLocked].filter(Boolean).length;
  const calculateRatioGrams = (ratio, caloriesPerGram) => {
    if (!baseEnergyTarget || !ratio || !caloriesPerGram) return 0;
    return Math.round((baseEnergyTarget * (ratio / 100)) / caloriesPerGram);
  };
  const handleRatioChange = (macro, value) => {
    value = Math.max(0, Math.min(100, Number(value) || 0));
    let newProtein = Math.max(0, proteinRatio || 0);
    let newCarb = Math.max(0, carbRatio || 0);
    let newFat = Math.max(0, fatRatio || 0);
    
    if (lockedCount === 2) {
      return;
    }
    if ((macro === 'protein' && proteinLocked) || (macro === 'carb' && carbLocked) || (macro === 'fat' && fatLocked)) {
      return;
    }
    if (lockedCount === 1) {
      if (proteinLocked) {
        if (macro === 'carb') {
          newCarb = value;
          newFat = 100 - proteinRatio - newCarb;
        } else if (macro === 'fat') {
          newFat = value;
          newCarb = 100 - proteinRatio - newFat;
        }
      } else if (carbLocked) {
        if (macro === 'protein') {
          newProtein = value;
          newFat = 100 - carbRatio - newProtein;
        } else if (macro === 'fat') {
          newFat = value;
          newProtein = 100 - carbRatio - newFat;
        }
      } else if (fatLocked) {
        if (macro === 'protein') {
          newProtein = value;
          newCarb = 100 - fatRatio - newProtein;
        } else if (macro === 'carb') {
          newCarb = value;
          newProtein = 100 - fatRatio - newCarb;
        }
      }
    }
    // No locks: adjust as before
    if (macro === 'protein') {
      const remaining = 100 - value;
      const total = carbRatio + fatRatio;
      if (total === 0) {
        newCarb = Math.round(remaining / 2);
        newFat = remaining - newCarb;
      } else {
        newCarb = Math.round((carbRatio / total) * remaining);
        newFat = remaining - newCarb;
      }
      newProtein = value;
    } else if (macro === 'carb') {
      const remaining = 100 - value;
      const total = proteinRatio + fatRatio;
      if (total === 0) {
        newProtein = Math.round(remaining / 2);
        newFat = remaining - newProtein;
      } else {
        newProtein = Math.round((proteinRatio / total) * remaining);
        newFat = remaining - newProtein;
      }
      newCarb = value;
    } else if (macro === 'fat') {
      const remaining = 100 - value;
      const total = proteinRatio + carbRatio;
      if (total === 0) {
        newProtein = Math.round(remaining / 2);
        newCarb = remaining - newProtein;
      } else {
        newProtein = Math.round((proteinRatio / total) * remaining);
        newCarb = remaining - newProtein;
      }
      newFat = value;
    }
    setProteinRatio(newProtein);
    setCarbRatio(newCarb);
    setFatRatio(newFat);
    checkShowSave(newProtein, newCarb, newFat);
  };
  const handleLockToggle = (macro) => {
    if (macro === 'protein') {
      if (!proteinLocked && lockedCount === 2) return;
      setProteinLocked(!proteinLocked);
    } else if (macro === 'carb') {
      if (!carbLocked && lockedCount === 2) return;
      setCarbLocked(!carbLocked);
    } else if (macro === 'fat') {
      if (!fatLocked && lockedCount === 2) return;
      setFatLocked(!fatLocked);
    }
  };
  const [original, setOriginal] = useState({
    protein_ratio: cachedProfile?.protein_ratio ?? 30,
    carb_ratio: cachedProfile?.carb_ratio ?? 50,
    fat_ratio: cachedProfile?.fat_ratio ?? 20
  });
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Sync with cached profile when it changes
  useEffect(() => {
    if (cachedProfile) {
      setProteinRatio(cachedProfile.protein_ratio ?? 30);
      setCarbRatio(cachedProfile.carb_ratio ?? 50);
      setFatRatio(cachedProfile.fat_ratio ?? 20);
      setOriginal({
        protein_ratio: cachedProfile.protein_ratio ?? 30,
        carb_ratio: cachedProfile.carb_ratio ?? 50,
        fat_ratio: cachedProfile.fat_ratio ?? 20
      });
    }
  }, [cachedProfile]);
  useEffect(() => {
    if (refreshEnergyTarget) {
      refreshEnergyTarget();
    }
  }, [refreshEnergyTarget]);
  const checkShowSave = (pr, cr, fr) => {
    setShowSaveButton(
      pr !== original.protein_ratio ||
      cr !== original.carb_ratio ||
      fr !== original.fat_ratio
    );
    setSaveSuccess(false);
  };
  const handleSave = async () => {
    const body = {
      protein_ratio: proteinRatio,
      carb_ratio: carbRatio,
      fat_ratio: fatRatio
    };
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to update macro targets');
      setOriginal((prev) => ({
        ...prev,
        ...body
      }));
      setShowSaveButton(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (triggerProfileRefresh) triggerProfileRefresh();
    } catch (err) {
      setSaveSuccess(false);
    }
  };
  if (baseEnergyTarget === null) {
    return <div>Loading energy target...</div>;
  }
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">Macro & Energy Targets</h2>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none"
            onClick={() => setShowTooltip(true)}
            aria-label="Show macro info"
          >
            <Info size={18} />
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-6">
        Targets for protein, carbs, fat and energy.
      </p>
      <div className="space-y-6">
        <div>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Set macro targets using</label>
            <div className="flex space-x-2">
              <button 
                className={'bg-gray-900 text-white px-4 py-2 rounded-full text-sm transition-colors'}
                disabled
              >
                Ratios
              </button>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center mb-1">
              <h3 className="font-medium text-gray-800">Macro Ratios</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Macro Ratios divides energy into protein, carbs, and fat. As your weight changes, so do your targets to keep your ratios steady.
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#4CAF50] mr-2"></div>
                    <span className="font-medium">Protein</span>
                    <button
                      type="button"
                      className="ml-2 text-gray-400 hover:text-gray-700"
                      onClick={() => handleLockToggle('protein')}
                      aria-label={proteinLocked ? 'Unlock protein' : 'Lock protein'}
                    >
                      {proteinLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="range" 
                      min="10" 
                      max="50" 
                      value={proteinRatio} 
                      onChange={(e) => handleRatioChange('protein', e.target.value)}
                      className="w-32 mr-2 accent-[#4CAF50]" 
                      disabled={lockedCount === 2 && !proteinLocked}
                    />
                    <span>{proteinRatio}%</span>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div style={{ width: `${proteinRatio * 2}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#4CAF50]"></div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>{calculateRatioGrams(proteinRatio, 4)}g</span>
                    <span className="text-gray-500">{proteinRatio ? Math.round(baseEnergyTarget * (proteinRatio / 100)) : 0} kcal</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#2196F3] mr-2"></div>
                    <span className="font-medium">Net Carbs</span>
                    <button
                      type="button"
                      className="ml-2 text-gray-400 hover:text-gray-700"
                      onClick={() => handleLockToggle('carb')}
                      aria-label={carbLocked ? 'Unlock carbs' : 'Lock carbs'}
                    >
                      {carbLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="range" 
                      min="5" 
                      max="70" 
                      value={carbRatio} 
                      onChange={(e) => handleRatioChange('carb', e.target.value)}
                      className="w-32 mr-2 accent-[#2196F3]" 
                      disabled={lockedCount === 2 && !carbLocked}
                    />
                    <span>{carbRatio}%</span>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div style={{ width: `${carbRatio * 1.4}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#2196F3]"></div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>{calculateRatioGrams(carbRatio, 4)}g</span>
                    <span className="text-gray-500">{carbRatio ? Math.round(baseEnergyTarget * (carbRatio / 100)) : 0} kcal</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#FFC107] mr-2"></div>
                    <span className="font-medium">Fat</span>
                    <button
                      type="button"
                      className="ml-2 text-gray-400 hover:text-gray-700"
                      onClick={() => handleLockToggle('fat')}
                      aria-label={fatLocked ? 'Unlock fat' : 'Lock fat'}
                    >
                      {fatLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="range" 
                      min="5" 
                      max="70" 
                      value={fatRatio} 
                      onChange={(e) => handleRatioChange('fat', e.target.value)}
                      className="w-32 mr-2 accent-[#FFC107]" 
                      disabled={lockedCount === 2 && !fatLocked}
                    />
                    <span>{fatRatio}%</span>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div style={{ width: `${fatRatio * 1.4}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#FFC107]"></div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>{calculateRatioGrams(fatRatio, 9)}g</span>
                    <span className="text-gray-500">{fatRatio ? Math.round(baseEnergyTarget * (fatRatio / 100)) : 0} kcal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {fetchError && <div className="text-red-500 text-sm mt-2">{fetchError}</div>}
      <div className="flex justify-end mt-6">
        {showSaveButton && (
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition"
            onClick={handleSave}
          >
            Save
          </button>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 ml-4 self-center">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span className="text-sm">Saved successfully</span>
          </div>
        )}
      </div>
    </div>
  );
};
