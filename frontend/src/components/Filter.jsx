import React, { useEffect, useState, useCallback, useRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'

const Filter = ({
    diningHall,
    setDiningHall,
    date,
    setDate,
    mealType,
    setMealType,
    cachedDiningHalls = [],
    cachedMealTypesByHall = {},
    onDataUpdate
}) => {
    // Use cached data as initial state to avoid flash on navigation
    const [diningHalls, setDiningHalls] = useState(cachedDiningHalls)
    const [mealTypesByHall, setMealTypesByHall] = useState(cachedMealTypesByHall)
    const [mealTypes, setMealTypes] = useState(() => {
        // Initialize mealTypes from cache if dining hall is selected
        if (diningHall && cachedMealTypesByHall[diningHall]) {
            return cachedMealTypesByHall[diningHall];
        }
        return [];
    })
    const [isLoading, setIsLoading] = useState(false)

    // Use refs to track if we're currently fetching to prevent duplicate calls
    const isFetchingRef = useRef(false)
    const lastFetchDateRef = useRef(null)
    // Track if we've already loaded data for current date
    const hasInitialData = useRef(cachedDiningHalls.length > 0)

    // Function to sort meal types in the correct order
    const sortMealTypes = useCallback((meals) => {
        const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Everyday'];
        
        return meals.sort((a, b) => {
            const indexA = mealOrder.indexOf(a);
            const indexB = mealOrder.indexOf(b);
            
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            
            return indexA - indexB;
        });
    }, []);

    // Auto-set today's date on mount ONLY
    useEffect(() => {
        if (!date) {
            setDate(new Date());
        }
    }, []); // Empty dependency array - only run once on mount

    // Fetch available options when date changes
    useEffect(() => {
        if (!date) {
            setDiningHalls([]);
            setMealTypesByHall({});
            setMealTypes([]);
            if (onDataUpdate) {
                onDataUpdate([], {});
            }
            return;
        }

        const formattedDate = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');

        // Skip fetch if we already have cached data and haven't fetched yet
        // (this handles navigation back to Dashboard with existing data)
        if (hasInitialData.current && diningHalls.length > 0) {
            hasInitialData.current = false; // Only skip once
            lastFetchDateRef.current = formattedDate;
            return;
        }

        // Prevent duplicate fetches
        if (isFetchingRef.current || lastFetchDateRef.current === formattedDate) {
            return;
        }

        isFetchingRef.current = true;
        lastFetchDateRef.current = formattedDate;
        setIsLoading(true);
        
        fetch(`/api/available-options?date=${formattedDate}`)
            .then(res => res.json())
            .then(data => {
                const halls = data.dining_halls || [];
                const mealsByHall = data.meal_types_by_hall || {};
                
                setDiningHalls(halls);
                setMealTypesByHall(mealsByHall);
                
                // Pass data back to Dashboard for progressive disclosure
                if (onDataUpdate) {
                    onDataUpdate(halls, mealsByHall);
                }
                
                // If a dining hall is already selected, update mealTypes
                if (diningHall && mealsByHall[diningHall]) {
                    const sortedMeals = sortMealTypes([...mealsByHall[diningHall]]);
                    setMealTypes(sortedMeals);
                    // If current mealType is not valid, reset it
                    if (!mealsByHall[diningHall].includes(mealType)) {
                        setMealType('');
                    }
                } else if (diningHall && !halls.includes(diningHall)) {
                    // Reset dining hall if it's not available on this date
                    setDiningHall('');
                    setMealTypes([]);
                    setMealType('');
                }
            })
            .catch((error) => {
                console.error('Error fetching available options:', error);
                setDiningHalls([]);
                setMealTypesByHall({});
                setMealTypes([]);
                if (onDataUpdate) {
                    onDataUpdate([], {});
                }
            })
            .finally(() => {
                setIsLoading(false);
                isFetchingRef.current = false;
            });
    }, [date]); // Only depend on date

    // Update meal types when dining hall changes
    useEffect(() => {
        if (diningHall && mealTypesByHall[diningHall]) {
            const sortedMeals = sortMealTypes([...mealTypesByHall[diningHall]]);
            setMealTypes(sortedMeals);
            // If current mealType is not valid, reset it
            if (!mealTypesByHall[diningHall].includes(mealType)) {
                setMealType('');
            }
        } else if (diningHall) {
            // Dining hall selected but no meal types available
            setMealTypes([]);
            setMealType('');
        }
    }, [diningHall, mealTypesByHall, mealType, setMealType, sortMealTypes]);

    // Smart auto-selection when options become available
    useEffect(() => {
        // Auto-select if only one dining hall available
        if (diningHalls.length === 1 && !diningHall) {
            setDiningHall(diningHalls[0]);
        }
    }, [diningHalls, diningHall, setDiningHall]);

    useEffect(() => {
        // Auto-select current meal based on time when dining hall is selected
        if (diningHall && mealTypes.length > 0 && !mealType) {
            const currentHour = new Date().getHours();
            let suggestedMeal = '';
            
            if (currentHour < 10 && mealTypes.includes('Breakfast')) {
                suggestedMeal = 'Breakfast';
            } else if (currentHour >= 10 && currentHour < 15 && mealTypes.includes('Lunch')) {
                suggestedMeal = 'Lunch';
            } else if (currentHour >= 15 && mealTypes.includes('Dinner')) {
                suggestedMeal = 'Dinner';
            } else if (mealTypes.includes('Everyday')) {
                suggestedMeal = 'Everyday';
            } else if (mealTypes.length === 1) {
                // If only one meal available, select it
                suggestedMeal = mealTypes[0];
            }
            
            if (suggestedMeal) {
                setMealType(suggestedMeal);
            }
        }
    }, [mealTypes, diningHall, mealType, setMealType]);


    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Date Picker */}
                <div>
                    <label
                        htmlFor="date-picker"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Date
                    </label>
                    <div className="relative">
                        <DatePicker
                            id="date-picker"
                            selected={date}
                            onChange={(date) => setDate(date)}
                            className="block w-full pl-3 pr-8 py-2.5 sm:py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md touch-manipulation"
                            wrapperClassName="w-full"
                            minDate={new Date(new Date().setMonth(new Date().getMonth() - 3))}
                            maxDate={new Date()}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                            <CalendarIcon size={16} />
                        </div>
                    </div>
                </div>

                {/* Dining Hall Selector */}
                <div>
                    <label
                        htmlFor="dining-hall"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Dining Hall
                    </label>
                    <div className="relative">
                        <select
                            id="dining-hall"
                            value={diningHall}
                            onChange={(e) => setDiningHall(e.target.value)}
                            disabled={isLoading || diningHalls.length === 0}
                            className="appearance-none block w-full pl-3 pr-10 py-2.5 sm:py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md disabled:bg-gray-100 disabled:text-gray-500 touch-manipulation"
                        >
                            <option value="">
                                {isLoading ? "Loading..." : 
                                 diningHalls.length === 0 ? "No dining halls available" :
                                 "Select Dining Hall"}
                            </option>
                            {diningHalls.map((hall) => (
                                <option key={hall} value={hall}>
                                    {hall}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <ChevronDownIcon className="text-gray-500" size={20} />
                        </div>
                    </div>
                </div>

                {/* Meal Type Selector - Only show if multiple options or no selection made */}
                {(!diningHall || mealTypes.length > 1 || !mealType) && (
                    <div>
                        <label
                            htmlFor="meal-type"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Meal
                        </label>
                        <div className="relative">
                            <select
                                id="meal-type"
                                value={mealType}
                                onChange={(e) => setMealType(e.target.value)}
                                disabled={!diningHall || mealTypes.length === 0}
                                className="appearance-none block w-full pl-3 pr-10 py-2.5 sm:py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md disabled:bg-gray-100 disabled:text-gray-500 touch-manipulation"
                            >
                                <option value="">
                                    {!diningHall ? "Select dining hall first" :
                                     mealTypes.length === 0 ? "No meals available" :
                                     "Select Meal Type"}
                                </option>
                                {mealTypes.map((meal) => (
                                    <option key={meal} value={meal}>
                                        {meal}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDownIcon className="text-gray-500" size={20} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Show selected meal when only one option and auto-selected */}
                {diningHall && mealTypes.length === 1 && mealType && (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Meal
                        </label>
                        <div className="block w-full pl-3 pr-3 py-2.5 sm:py-2 text-sm border border-gray-300 bg-gray-50 text-gray-700 rounded-md">
                            {mealType}
                            <span className="text-xs text-gray-500 ml-2">(Only option available)</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Filter