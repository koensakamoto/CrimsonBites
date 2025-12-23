import React, { useState, useEffect, useMemo } from 'react'
import {
    PieChart,
    Pie,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts'
import { XIcon, TrashIcon, ClipboardPlus, CheckIcon } from 'lucide-react'
import { useAuth } from '../AuthProvider'

function getAdjustedPortion(portionSize, quantity) {
    if (!portionSize || typeof portionSize !== 'string') return '';
    if (!quantity) quantity = 1;
    const match = portionSize.match(/^([\d\.\/]+)\s*(.*)$/);
    if (!match) return portionSize; // fallback
    let [_, amount, unit] = match;
    // Handle fractions like "1/2"
    let numericAmount = 1;
    if (amount.includes('/')) {
        const [num, denom] = amount.split('/').map(Number);
        numericAmount = num / denom;
    } else {
        numericAmount = parseFloat(amount);
    }
    const adjusted = (numericAmount * quantity).toFixed(2).replace(/\.00$/, '');
    return `${adjusted} ${unit}`.trim();
}

const NutrientTracker = ({ trackedItems, removeItem, clearItems, selectedDate, onSavePlate, isMobile = false }) => {
    const { user } = useAuth();
    const [saveSuccess, setSaveSuccess] = useState(false);
    const plateEmpty = trackedItems.length === 0;
    
    // Auto-clear save success message with proper cleanup
    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => setSaveSuccess(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveSuccess]);
    // Calculate nutrition totals (memoized)
    const totals = useMemo(() => trackedItems.reduce(
        (acc, item) => {
            const qty = item.quantity || 1;
            return {
                calories: acc.calories + (Number(item.calories) || 0) * qty,
                protein: acc.protein + (Number(item.protein) || 0) * qty,
                carbs: acc.carbs + (Number(item.carbs) || 0) * qty,
                fat: acc.fat + (Number(item.totalFat) || 0) * qty,
            }
        },
        {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
        },
    ), [trackedItems])

    // Data for pie chart (memoized)
    const pieData = useMemo(() => [
        {
            name: 'Protein',
            value: totals.protein * 4,
            color: '#4299e1',
        },
        {
            name: 'Carbs',
            value: totals.carbs * 4,
            color: '#48bb78',
        },
        {
            name: 'Fat',
            value: totals.fat * 9,
            color: '#ed8936',
        }, // 9 calories per gram
    ], [totals.protein, totals.carbs, totals.fat])

    // Data for bar chart (% of daily recommended values) (memoized)
    const barData = useMemo(() => [
        {
            name: 'Calories',
            percent: (totals.calories / 2000) * 100,
            color: '#4c51bf',
        },
        {
            name: 'Protein',
            percent: (totals.protein / 50) * 100,
            color: '#4299e1',
        },
        {
            name: 'Carbs',
            percent: (totals.carbs / 275) * 100,
            color: '#48bb78',
        },
        {
            name: 'Fat',
            percent: (totals.fat / 78) * 100,
            color: '#ed8936',
        },
    ], [totals.calories, totals.protein, totals.carbs, totals.fat])
    const handleSave = async () => {
        if (onSavePlate) {
            await onSavePlate();
            setSaveSuccess(true);
        }
    }
    return (
        <div className={`bg-white rounded-xl shadow-lg ${isMobile ? 'p-3 sm:p-4' : 'p-4'} flex flex-col h-full border border-gray-100 overflow-hidden`}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-800">My Plate</h2>
                <button
                    onClick={clearItems}
                    className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                    aria-label="Clear all items from plate"
                >
                    <TrashIcon size={18} />
                </button>
            </div>
            <div className="flex-grow overflow-y-auto overflow-x-hidden">
            {plateEmpty ? (
                <div className={`text-center h-full ${isMobile ? 'px-3 py-6' : 'px-4'} text-gray-500 flex flex-col items-center justify-center`}>
                    <ClipboardPlus size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">Your plate is empty</h3>
                    <p className="text-sm mt-1">Add items from the menu to see your nutrition breakdown.</p>
                </div>
            ) : (
                <>
                    <div className={`${isMobile ? 'mb-3' : 'mb-4'} grid grid-cols-2 gap-2 min-w-0`}>
                        <div className={`bg-gray-50 ${isMobile ? 'p-2.5' : 'p-3'} rounded-lg text-center min-w-0`}>
                            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-800 truncate`}>{totals.calories.toFixed(1)}</div>
                            <div className="text-xs text-gray-500">Calories</div>
                        </div>
                        <div className={`bg-gray-50 ${isMobile ? 'p-2.5' : 'p-3'} rounded-lg text-center min-w-0`}>
                            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-blue-600 truncate`}>{totals.protein.toFixed(1)}g</div>
                            <div className="text-xs text-gray-500">Protein</div>
                        </div>
                        <div className={`bg-gray-50 ${isMobile ? 'p-2.5' : 'p-3'} rounded-lg text-center min-w-0`}>
                            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-green-600 truncate`}>{totals.carbs.toFixed(1)}g</div>
                            <div className="text-xs text-gray-500">Carbs</div>
                        </div>
                        <div className={`bg-gray-50 ${isMobile ? 'p-2.5' : 'p-3'} rounded-lg text-center min-w-0`}>
                            <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-orange-600 truncate`}>{totals.fat.toFixed(1)}g</div>
                            <div className="text-xs text-gray-500">Fat</div>
                        </div>
                    </div>
                    <div className="my-4 border-t border-gray-200"></div>
                    {user && !user.guest && (
                        <button
                            onClick={handleSave}
                            className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold ${isMobile ? 'py-2.5 text-sm' : 'py-3'} rounded-lg shadow hover:bg-blue-700 transition-all duration-200 ${isMobile ? 'mb-2' : 'mb-2'} touch-manipulation`}
                            disabled={saveSuccess}
                        >
                            {saveSuccess ? (
                                <CheckIcon className="h-5 w-5" />
                            ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4m-5 4h.01"></path>
                                </svg>
                            )}
                            {saveSuccess ? 'Saved!' : 'Save Plate'}
                        </button>
                    )}
                    <div className={isMobile ? 'mb-4 mt-0' : 'mb-4'}>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Calorie Breakdown</h3>
                        <ResponsiveContainer width="100%" height={isMobile ? 140 : 160}>
                            <PieChart margin={{ top: isMobile ? 10 : 15, right: 0, bottom: isMobile ? 20 : 30, left: 0 }}>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy={isMobile ? "50%" : "40%"}
                                    outerRadius={isMobile ? 45 : 45}
                                    innerRadius={isMobile ? 32 : 35}
                                    labelLine={false}
                                >
                                    {pieData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{
                                        paddingTop: isMobile ? "15px" : "20px",
                                        height: "25px",
                                        fontSize: "12px"
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className={`${isMobile ? 'mb-2' : 'mb-6'}`}>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">% Daily Values</h3>
                        <ResponsiveContainer width="100%" height={isMobile ? 120 : 140}>
                            <BarChart
                                data={barData}
                                layout="vertical"
                                margin={{ left: 5, right: 10, top: 5, bottom: 5 }}
                                barCategoryGap={14}
                            >
                                <XAxis 
                                    type="number" 
                                    hide 
                                    domain={[0, 'dataMax + 20']}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={60}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip formatter={v => `${v.toFixed(0)}%`} />
                                <Bar dataKey="percent" radius={[6, 6, 6, 6]} barSize={14}>
                                    {barData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className={`border-t border-gray-200 ${isMobile ? 'pt-3' : 'pt-4'}`}>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Items on your plate</h3>
                        <ul className="divide-y divide-gray-200">
                            {trackedItems.map((item) => (
                                <li
                                    key={item.uniqueId}
                                    className={`${isMobile ? 'py-1.5' : 'py-2'} flex justify-between items-center`}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {((item.calories || 0) * (item.quantity || 1)).toFixed(1)} cal · {getAdjustedPortion(item.portionSize, item.quantity)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeItem(item.uniqueId)}
                                        className="text-gray-400 hover:text-gray-600 touch-manipulation p-1 -m-1"
                                        aria-label={`Remove ${item.name} from plate`}
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
            </div>
        </div>
    )
}
export default NutrientTracker
