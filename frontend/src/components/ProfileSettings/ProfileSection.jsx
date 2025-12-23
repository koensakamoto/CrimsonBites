import React, { useState, useEffect, useRef } from 'react';
import { Info, CheckCircle2 } from 'lucide-react';
import { ProfileInfoTooltip } from './ProfileInfoTooltip';
import { useAuth } from '../../AuthProvider';

// Helper to parse profile data into component state
const parseProfileData = (profile) => {
  let bday = { day: '', month: '', year: '' };
  if (profile?.birthday) {
    const [year, month, day] = profile.birthday.split('-');
    bday = {
      day: String(Number(day)),
      month: String(Number(month)),
      year: year
    };
  }

  let heightFt = '';
  let heightIn = '';
  if (profile?.height) {
    const totalInches = profile.height;
    heightFt = Math.floor(totalInches / 12).toString();
    heightIn = Math.round(totalInches % 12).toString();
  }

  return {
    sex: profile?.sex || 'male',
    birthday: bday,
    heightFt,
    heightIn,
    weight: profile?.weight ? profile.weight.toFixed(1) : '',
    weightGoal: profile?.weight_goal ? profile.weight_goal.toString() : '',
    bodyFat: profile?.body_fat_percent?.toString() || '',
    original: {
      sex: profile?.sex || 'male',
      birthday: profile?.birthday || '',
      height: profile?.height || '',
      weight: profile?.weight || '',
      weight_goal: profile?.weight_goal || '',
      body_fat_percent: profile?.body_fat_percent || '',
    }
  };
};

export const ProfileSection = ({ energyTarget, refreshEnergyTarget, triggerProfileRefresh }) => {
  const { user, updateUserProfile } = useAuth();
  const cachedProfile = user?.profile;
  const initialData = parseProfileData(cachedProfile);
  const hasInitialized = useRef(false);

  // State for profile fields - initialize from cached data
  const [sex, setSex] = useState(initialData.sex);
  const [birthday, setBirthday] = useState(initialData.birthday);
  const [heightFt, setHeightFt] = useState(initialData.heightFt);
  const [heightIn, setHeightIn] = useState(initialData.heightIn);
  const [weight, setWeight] = useState(initialData.weight);
  const [weightGoal, setWeightGoal] = useState(initialData.weightGoal);
  const [bodyFat, setBodyFat] = useState(initialData.bodyFat);
  const [original, setOriginal] = useState(initialData.original);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Sync with cached profile when it changes (e.g., after login or refetch)
  useEffect(() => {
    if (cachedProfile && !hasInitialized.current) {
      const data = parseProfileData(cachedProfile);
      setSex(data.sex);
      setBirthday(data.birthday);
      setHeightFt(data.heightFt);
      setHeightIn(data.heightIn);
      setWeight(data.weight);
      setWeightGoal(data.weightGoal);
      setBodyFat(data.bodyFat);
      setOriginal(data.original);
      setFetchError(null);
      setValidationErrors({});
      hasInitialized.current = true;
    }
  }, [cachedProfile]);

  const checkShowSave = (newSex, newBirthday, newHeight, newWeight, newWeightGoal, newBodyFat) => {
    const hasChanges = (
      newSex !== original.sex ||
      newBirthday !== original.birthday ||
      Number(newHeight) !== Number(original.height) || 
      Number(newWeight) !== Number(original.weight) ||
      Number(newWeightGoal) !== Number(original.weight_goal) ||
      Number(newBodyFat) !== Number(original.body_fat_percent)
    );
    setShowSaveButton(hasChanges);
    setSaveSuccess(false);
  };

  // Input handlers - only clear errors, validate on save

  const handleHeightFt = (e) => {
    setHeightFt(e.target.value);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.heightFt;
    setValidationErrors(errors);
    checkShowSave(sex, birthdayToISO(birthday), getHeightInches(e.target.value, heightIn), weight, weightGoal, bodyFat);
  };
  const handleHeightIn = (e) => {
    setHeightIn(e.target.value);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.heightIn;
    setValidationErrors(errors);
    checkShowSave(sex, birthdayToISO(birthday), getHeightInches(heightFt, e.target.value), weight, weightGoal, bodyFat);
  };
  const handleWeight = (e) => {
    setWeight(e.target.value);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.weight;
    setValidationErrors(errors);
    checkShowSave(sex, birthdayToISO(birthday), getHeightInches(), e.target.value, weightGoal, bodyFat);
  };
  const handleWeightGoal = (e) => {
    setWeightGoal(e.target.value);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.weightGoal;
    setValidationErrors(errors);
    checkShowSave(sex, birthdayToISO(birthday), getHeightInches(), weight, e.target.value, bodyFat);
  };
  const handleBodyFat = (e) => {
    setBodyFat(e.target.value);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.bodyFat;
    setValidationErrors(errors);
    checkShowSave(sex, birthdayToISO(birthday), getHeightInches(), weight, weightGoal, e.target.value);
  };


  const handleSexChange = (e) => {
    setSex(e.target.value);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.sex;
    setValidationErrors(errors);
    checkShowSave(e.target.value, birthdayToISO(birthday), getHeightInches(), weight, weightGoal, bodyFat);
  };

  const handleBirthdayChange = (field, value) => {
    const newBirthday = { ...birthday, [field]: value };
    setBirthday(newBirthday);
    // Clear any existing errors for this field
    const errors = { ...validationErrors };
    delete errors.birthday;
    setValidationErrors(errors);
    checkShowSave(sex, birthdayToISO(newBirthday), getHeightInches(), weight, weightGoal, bodyFat);
  };

  // Helpers for conversions
  const getHeightInches = (ft = heightFt, inch = heightIn) => {
    const f = parseFloat(ft) || 0;
    const i = parseFloat(inch) || 0;
    
    // Validate reasonable height ranges
    if (f < 0 || f > 12 || i < 0 || i >= 12) {
      console.warn('Invalid height provided:', { ft: f, in: i });
      return '0';
    }
    
    const totalInches = f * 12 + i;
    
    // Validate total height is reasonable (2-12 feet)
    if (totalInches < 24 || totalInches > 144) {
      console.warn('Height outside reasonable range:', totalInches);
    }
    
    return totalInches.toString();
  };
  const birthdayToISO = (b) => {
    if (!b.day || !b.month || !b.year) return '';
    
    // Convert to strings and validate
    const year = String(b.year).padStart(4, '0');
    const month = String(b.month).padStart(2, '0');
    const day = String(b.day).padStart(2, '0');
    
    // Basic date validation
    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() != year || 
        testDate.getMonth() != month - 1 || 
        testDate.getDate() != day) {
      console.warn('Invalid date provided:', { day, month, year });
      return '';
    }
    
    return `${year}-${month}-${day}`;
  };

  // Save handler
  const handleSave = async () => {
    // Validate all required fields and collect errors
    let hasErrors = false;
    const newErrors = {};

    // Validate sex
    if (!sex || (sex !== 'male' && sex !== 'female')) {
      newErrors.sex = 'Please select your sex (Male or Female)';
      hasErrors = true;
    }

    // Validate birthday
    if (!birthday.day || !birthday.month || !birthday.year) {
      newErrors.birthday = 'Please provide complete birthday (day, month, and year)';
      hasErrors = true;
    } else {
      const day = parseInt(birthday.day);
      const month = parseInt(birthday.month);
      const year = parseInt(birthday.year);
      const currentYear = new Date().getFullYear();
      
      if (isNaN(day) || day < 1 || day > 31) {
        newErrors.birthday = 'Day must be between 1-31';
        hasErrors = true;
      } else if (isNaN(month) || month < 1 || month > 12) {
        newErrors.birthday = 'Month must be between 1-12';
        hasErrors = true;
      } else if (isNaN(year) || year < 1900 || year > currentYear) {
        newErrors.birthday = `Year must be between 1900-${currentYear}`;
        hasErrors = true;
      } else {
        const testDate = new Date(year, month - 1, day);
        if (testDate.getFullYear() !== year || 
            testDate.getMonth() !== month - 1 || 
            testDate.getDate() !== day) {
          newErrors.birthday = 'Please provide a valid date';
          hasErrors = true;
        } else if (currentYear - year < 13) {
          newErrors.birthday = 'You must be at least 13 years old';
          hasErrors = true;
        }
      }
    }

    // Validate height feet
    if (!heightFt || heightFt.trim() === '') {
      newErrors.heightFt = 'Height feet is required';
      hasErrors = true;
    } else {
      const ft = parseFloat(heightFt);
      if (isNaN(ft)) {
        newErrors.heightFt = 'Height feet must be a valid number';
        hasErrors = true;
      } else if (ft < 3 || ft > 8) {
        newErrors.heightFt = 'Height must be between 3-8 feet';
        hasErrors = true;
      } else if (!Number.isInteger(ft)) {
        newErrors.heightFt = 'Height feet must be a whole number';
        hasErrors = true;
      }
    }

    // Validate height inches
    if (!heightIn || heightIn.trim() === '') {
      newErrors.heightIn = 'Height inches is required';
      hasErrors = true;
    } else {
      const inch = parseFloat(heightIn);
      if (isNaN(inch)) {
        newErrors.heightIn = 'Height inches must be a valid number';
        hasErrors = true;
      } else if (inch < 0 || inch >= 12) {
        newErrors.heightIn = 'Inches must be between 0-11';
        hasErrors = true;
      } else if (inch % 0.5 !== 0) {
        newErrors.heightIn = 'Inches must be in 0.5 inch increments';
        hasErrors = true;
      }
    }

    // Validate weight
    if (!weight || weight.trim() === '') {
      newErrors.weight = 'Weight is required';
      hasErrors = true;
    } else {
      const wt = parseFloat(weight);
      if (isNaN(wt)) {
        newErrors.weight = 'Weight must be a valid number';
        hasErrors = true;
      } else if (wt < 50 || wt > 500) {
        newErrors.weight = 'Weight must be between 50-500 lbs';
        hasErrors = true;
      } else if (weight.split('.')[1]?.length > 1) {
        newErrors.weight = 'Weight can have at most 1 decimal place';
        hasErrors = true;
      }
    }

    // Validate weight goal
    if (!weightGoal || weightGoal.trim() === '') {
      newErrors.weightGoal = 'Weight goal is required';
      hasErrors = true;
    } else {
      const wg = parseFloat(weightGoal);
      if (isNaN(wg)) {
        newErrors.weightGoal = 'Weight goal must be a valid number';
        hasErrors = true;
      } else if (wg < 50 || wg > 500) {
        newErrors.weightGoal = 'Weight goal must be between 50-500 lbs';
        hasErrors = true;
      } else if (weightGoal.split('.')[1]?.length > 1) {
        newErrors.weightGoal = 'Weight goal can have at most 1 decimal place';
        hasErrors = true;
      }
    }

    // Validate body fat
    if (!bodyFat || bodyFat.trim() === '') {
      newErrors.bodyFat = 'Body fat percentage is required';
      hasErrors = true;
    } else {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf)) {
        newErrors.bodyFat = 'Body fat must be a valid number';
        hasErrors = true;
      } else if (bf < 1 || bf > 60) {
        newErrors.bodyFat = 'Body fat must be between 1-60%';
        hasErrors = true;
      } else if (bodyFat.split('.')[1]?.length > 1) {
        newErrors.bodyFat = 'Body fat can have at most 1 decimal place';
        hasErrors = true;
      }
    }

    // If there are errors, show them and prevent save
    if (hasErrors) {
      newErrors.general = 'Please fix all errors below before saving';
      setValidationErrors(newErrors);
      return;
    }

    // Clear all errors if validation passes
    setValidationErrors({});

    // Final validation checks
    const heightInches = parseFloat(getHeightInches());
    const weightLbs = parseFloat(weight);
    const bodyFatPercent = bodyFat ? parseFloat(bodyFat) : undefined;
    
    if (!heightInches || heightInches < 36 || heightInches > 96) {
      setValidationErrors(prev => ({...prev, height: 'Total height must be between 3-8 feet'}));
      return;
    }
    if (!weightLbs || weightLbs < 50 || weightLbs > 500) {
      setValidationErrors(prev => ({...prev, weight: 'Weight must be between 50-500 lbs'}));
      return;
    }
    if (bodyFatPercent !== undefined && (bodyFatPercent < 1 || bodyFatPercent > 60)) {
      setValidationErrors(prev => ({...prev, bodyFat: 'Body fat must be between 1-60%'}));
      return;
    }
    if (!birthdayToISO(birthday)) {
      setValidationErrors(prev => ({...prev, birthday: 'Please provide a valid birthday'}));
      return;
    }

    // Clear any previous errors if we get here
    setValidationErrors({});
    
    const body = {
      sex,
      birthday: birthdayToISO(birthday),
      height: Math.round(heightInches),
      weight: weightLbs,
      weight_goal: parseFloat(weightGoal),
      body_fat_percent: bodyFatPercent,
    };
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      
      // Log weight change - don't fail if this fails
      try {
        const weightLogRes = await fetch('/api/weight-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ weight: parseFloat(weight) })
        });
        if (!weightLogRes.ok) {
          console.warn('Failed to log weight change');
        }
      } catch (weightLogErr) {
        console.warn('Failed to log weight change:', weightLogErr);
      }
      setOriginal({
        sex: body.sex,
        birthday: body.birthday,
        height: body.height,
        weight: body.weight,
        weight_goal: body.weight_goal,
        body_fat_percent: body.body_fat_percent,
      });
      setShowSaveButton(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Update cached profile in AuthProvider
      updateUserProfile({
        sex: body.sex,
        birthday: body.birthday,
        height: body.height,
        weight: body.weight,
        weight_goal: body.weight_goal,
        body_fat_percent: body.body_fat_percent,
      });

      if (refreshEnergyTarget) refreshEnergyTarget();
      if (triggerProfileRefresh) triggerProfileRefresh();
    } catch (err) {
      setSaveSuccess(false);
    }
  };

  // Render options for day, month, year
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' }, { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' }, { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' }, { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
  ];
  // Show years for ages 13-80 (more realistic range for most users)
  const currentYear = new Date().getFullYear();
  const minAge = 13;
  const maxAge = 80;
  const years = Array.from({ length: maxAge - minAge + 1 }, (_, i) => (currentYear - minAge - i).toString());

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">Profile</h2>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none"
            onClick={() => setShowTooltip(true)}
            aria-label="Show profile info"
          >
            <Info size={18} />
          </button>
        </div>
      </div>
      <ProfileInfoTooltip
        isOpen={showTooltip}
        onClose={() => setShowTooltip(false)}
        section="profile"
      />
      {fetchError && <div className="text-red-600 mb-4">{fetchError}</div>}
      {validationErrors.general && <div className="text-red-600 mb-4">{validationErrors.general}</div>}
      <div className="space-y-6">
        <div className="overflow-visible">
          <fieldset>
            <legend className="block text-gray-700 font-medium mb-2">Sex</legend>
            <div className="flex space-x-8">
              <label className="flex items-center cursor-pointer" htmlFor="sex-male">
                <div className="relative">
                  <input 
                    type="radio" 
                    name="sex" 
                    value="male" 
                    className="sr-only" 
                    checked={sex === 'male'} 
                    onChange={handleSexChange} 
                    id="sex-male"
                    aria-describedby="sex-description"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 ${sex === 'male' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'} mr-3 flex-shrink-0`}>
                    {sex === 'male' && <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>}
                  </div>
                </div>
                <span className="text-gray-700">Male</span>
              </label>
              <label className="flex items-center cursor-pointer" htmlFor="sex-female">
                <div className="relative">
                  <input
                    type="radio"
                    name="sex"
                    value="female"
                    className="sr-only"
                    checked={sex === 'female'}
                    onChange={handleSexChange}
                    id="sex-female"
                    aria-describedby="sex-description"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 ${sex === 'female' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'} mr-3 flex-shrink-0`}>
                    {sex === 'female' && <div className="w-2 h-2 rounded-full bg-white m-0.5"></div>}
                  </div>
                </div>
                <span className="text-gray-700">Female</span>
              </label>
            </div>
            <div id="sex-description" className="sr-only">Required for calculating daily nutritional needs</div>
          </fieldset>
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Birthday</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Day</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={birthday.day} onChange={e => handleBirthdayChange('day', e.target.value)}>
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Month</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={birthday.month} onChange={e => handleBirthdayChange('month', e.target.value)}>
                <option value="">Month</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Year</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={birthday.year} onChange={e => handleBirthdayChange('year', e.target.value)}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {validationErrors.birthday && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.birthday}</p>
          )}
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Height</label>
          <div className="flex items-center">
            <input
              type="text"
              value={heightFt}
              onChange={handleHeightFt}
              className={`w-16 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.heightFt ? 'border-red-500' : 'border-gray-300'}`}
            />
            <span className="mx-2">ft</span>
            <input
              type="text"
              value={heightIn}
              onChange={handleHeightIn}
              className={`w-16 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.heightIn ? 'border-red-500' : 'border-gray-300'}`}
            />
            <span className="mx-2">in</span>
          </div>
          {(validationErrors.heightFt || validationErrors.heightIn || validationErrors.height) && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.heightFt || validationErrors.heightIn || validationErrors.height}
            </p>
          )}
        </div>
        <div className="flex justify-between items-center">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Current Weight</label>
            <div className="flex items-center">
              <input
                type="text"
                value={weight}
                onChange={handleWeight}
                className={`w-24 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.weight ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="mx-2">lbs</span>
            </div>
            {validationErrors.weight && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.weight}</p>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Weight Goal</label>
            <div className="flex items-center">
              <input
                type="text"
                value={weightGoal}
                onChange={handleWeightGoal}
                className={`w-24 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.weightGoal ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="mx-2">lbs</span>
            </div>
            {validationErrors.weightGoal && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.weightGoal}</p>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Body Fat %</label>
            <div className="flex items-center">
              <input
                type="text"
                value={bodyFat}
                onChange={handleBodyFat}
                className={`w-24 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.bodyFat ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="mx-2">%</span>
            </div>
            {validationErrors.bodyFat && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.bodyFat}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">BMI</label>
          <p className="text-sm text-gray-500 mb-2">
            Your BMI can't be edited as it is a function of your weight & height.
          </p>
          <div className="bg-gray-100 rounded px-3 py-2 w-32 text-gray-700">
            {/* BMI calculation could be shown here if desired */}
            {(() => {
              const hIn = parseFloat(getHeightInches());
              const wLb = parseFloat(weight);
              
              // Validate inputs
              if (!hIn || !wLb || hIn <= 0 || wLb <= 0 || isNaN(hIn) || isNaN(wLb)) {
                return '';
              }
              
              // Check reasonable ranges
              if (hIn < 36 || hIn > 96 || wLb < 50 || wLb > 500) {
                return '';
              }
              
              const wKg = wLb * 0.453592;
              const hM = hIn * 0.0254;
              
              // Prevent division by zero
              if (hM === 0) {
                return '';
              }
              
              const bmi = wKg / (hM * hM);
              
              // Validate result
              if (!isFinite(bmi) || bmi <= 0 || bmi > 100) {
                return '';
              }
              
              return bmi.toFixed(1);
            })()}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          {showSaveButton && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              onClick={handleSave}
            >
              Save Profile
            </button>
          )}
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 mt-3">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span className="text-sm">Profile saved successfully</span>
          </div>
        )}
      </div>
    </div>
  );
};
