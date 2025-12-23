import React, { useState, memo } from 'react'
import {
  PlusIcon,
  MinusIcon,
  InfoIcon,
  LeafIcon,
  SaladIcon,
  BeefIcon,
  ThermometerIcon,
} from 'lucide-react'

const FoodItem = memo(({ item, addToTracker }) => {
  const [showDetails, setShowDetails] = useState(false)
  const [servings, setServings] = useState(1);

  // Helper function to display nutrient values, showing '-' for null/undefined
  const displayNutrient = (value, unit = '', defaultText = '-') => {
    if (value === null || value === undefined) {
      return defaultText;
    }
    return `${value}${unit}`;
  };

  
  const renderTag = (tag) => {
    const normalized = String(tag).toLowerCase()
    switch (normalized) {
      case 'vegetarian':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <SaladIcon size={12} className="mr-1" />
            Vegetarian
          </span>
        )
      case 'vegan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-200 text-green-900">
            <LeafIcon size={12} className="mr-1" />
            Vegan
          </span>
        )
      case 'protein':
      case 'good source of protein':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <BeefIcon size={12} className="mr-1" />
            Protein
          </span>
        )
      case 'climate-friendly':
      case 'climate friendly':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <ThermometerIcon size={12} className="mr-1" />
            Climate Friendly
          </span>
        )
      default:
        return null
    }
  }
  
  return (
    <div className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-150">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">{item.name}</h4>
          <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-2 space-x-4">
            <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium">{item.portionSize}</span>
          </div>
          {/* Key nutrition info always visible */}
          <div className="mt-2 text-xs sm:text-sm text-gray-700">
            {(() => {
              const nutritionItems = [
                { value: item.calories, label: ' cal', isCalories: true },
                { value: item.protein, label: 'g protein' },
                { value: item.carbs, label: 'g carbs' },
                { value: item.totalFat, label: 'g fat' }
              ];
              
              const validItems = nutritionItems.filter(item => 
                item.value !== null && item.value !== undefined && item.value !== '-' && item.value !== ''
              );
              
              return validItems.map((nutrient, index) => (
                <span key={index}>
                  {index > 0 && <span className="mx-2 text-gray-400">•</span>}
                  <span className={nutrient.isCalories ? "font-semibold text-gray-900" : ""}>
                    {displayNutrient(nutrient.value, nutrient.label)}
                  </span>
                </span>
              ));
            })()}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(item.tags || []).map((tag) => (
              <span key={tag} className="inline-block">
                {renderTag(tag)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 ml-2 sm:ml-4">
          <div className="flex items-center bg-white border border-gray-100 rounded-xl shadow-lg">
            <button
              onClick={() => setServings(Math.max(0.1, Math.round((servings - 0.1) * 10) / 10))}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors touch-manipulation"
              aria-label="Decrease servings"
              tabIndex={-1}
            >
              <MinusIcon className="h-4 w-4 text-gray-600" />
            </button>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={servings}
              onChange={e => setServings(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="w-12 sm:w-14 text-center bg-transparent border-none focus:ring-2 focus:ring-red-500 focus:bg-white rounded outline-none appearance-none py-1.5 sm:py-2 text-sm font-medium touch-manipulation"
              aria-label="Servings"
              style={{
                MozAppearance: 'textfield',
                appearance: 'textfield'
              }}
            />
            <button
              onClick={() => setServings(Math.max(0.1, Math.round((servings + 0.1) * 10) / 10))}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors touch-manipulation"
              aria-label="Increase servings"
              tabIndex={-1}
            >
              <PlusIcon className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => {
              if (item.trackable !== false) {
                addToTracker(item, servings);
                setServings(1);
              }
            }}
            disabled={item.trackable === false}
            className={`${
              item.trackable === false
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md transform hover:-translate-y-0.5"
            } p-2.5 sm:p-3 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation`}
            aria-label={item.trackable === false ? "Cannot track - incomplete nutrition data" : "Add item to plate"}
          >
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Warning message for non-trackable foods */}
      {item.trackable === false && (
        <div className="mt-3 border-l border-amber-300 pl-3 py-1">
          <div className="flex items-center space-x-1.5">
            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
            <p className="text-xs text-gray-600">
              Missing nutrition data — try <span className="font-medium text-gray-800">"Add Custom Meal"</span>
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center mt-4 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors duration-150 touch-manipulation"
      >
        <InfoIcon className="h-4 w-4 mr-2" />
        {showDetails ? 'Hide details' : 'Show details'}
      </button>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-700">
          <div className="space-y-3">
            <div className="font-bold text-gray-800 border-b border-gray-200 pb-1 text-sm">
              Nutrition Facts
            </div>
            
            {/* Compact 4-column layout for key macros */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 sm:gap-y-1 bg-gray-50 p-3 rounded">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{displayNutrient(item.calories)}</div>
                <div className="text-gray-600">Calories</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{displayNutrient(item.protein, 'g')}</div>
                <div className="text-gray-600">Protein</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{displayNutrient(item.carbs, 'g')}</div>
                <div className="text-gray-600">Carbs</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">{displayNutrient(item.totalFat, 'g')}</div>
                <div className="text-gray-600">Fat</div>
              </div>
            </div>

            {/* Detailed nutrition in compact 2-column layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <div><span className="font-medium">Saturated Fat:</span> {displayNutrient(item.saturatedFat, 'g')}</div>
              <div><span className="font-medium">Trans Fat:</span> {displayNutrient(item.transFat, 'g')}</div>
              <div><span className="font-medium">Cholesterol:</span> {displayNutrient(item.cholesterol, 'mg')}</div>
              <div><span className="font-medium">Sodium:</span> {displayNutrient(item.sodium, 'mg')}</div>
              <div><span className="font-medium">Dietary Fiber:</span> {displayNutrient(item.dietaryFiber, 'g')}</div>
              <div><span className="font-medium">Sugars:</span> {displayNutrient(item.sugars, 'g')}</div>
              <div><span className="font-medium">Potassium:</span> {displayNutrient(item.potassium, 'mg')}</div>
              <div><span className="font-medium">Calcium:</span> {displayNutrient(item.calcium, 'mg')}</div>
              <div><span className="font-medium">Iron:</span> {displayNutrient(item.iron, 'mg')}</div>
              <div><span className="font-medium">Vitamin C:</span> {displayNutrient(item.vitaminC, 'mg')}</div>
            </div>

            {item.ingredients && item.ingredients.length > 0 ? (
              <div className="mt-2 text-xs p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">Ingredients:</span>{' '}
                <span className="text-gray-600">{item.ingredients.join(', ')}</span>
              </div>
            ) : item.description && (
              <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">{item.description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

FoodItem.displayName = 'FoodItem'

export default FoodItem
