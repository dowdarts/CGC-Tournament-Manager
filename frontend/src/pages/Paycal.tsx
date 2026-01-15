import React, { useState, useEffect, useRef } from 'react';

interface Prize {
  place: string;
  percent: number;
  split: number;
}

interface PrizeData {
  place: string;
  percent: number;
  split: number;
  unroundedAmount: number;
  roundedAmount: number;
  correctedAmount?: number;
}

interface Ranks {
  place: string;
  split: number;
}

interface AppState {
  format: 'singles' | 'doubles';
  doublesType: 'same' | 'mixed';
  entryFee: number;
  numPlayers: number;
  enableDartConnectFee: boolean;
  dartConnectFee: number;
  enableHighScoreCont: boolean;
  highScoreCont: number;
  enableHighFinishCont: boolean;
  highFinishCont: number;
  prizes: Prize[];
  selectedPreset: string | null;
}

const Paycal: React.FC = () => {
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [doublesType, setDoublesType] = useState<'same' | 'mixed'>('same');
  const [entryFee, setEntryFee] = useState(30);
  const [numPlayers, setNumPlayers] = useState(32);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [enableDartConnectFee, setEnableDartConnectFee] = useState(true);
  const [dartConnectFee, setDartConnectFee] = useState(3.00);
  const [enableHighScoreCont, setEnableHighScoreCont] = useState(true);
  const [highScoreCont, setHighScoreCont] = useState(1.00);
  const [enableHighFinishCont, setEnableHighFinishCont] = useState(true);
  const [highFinishCont, setHighFinishCont] = useState(1.00);
  const [selectedPreset, setSelectedPreset] = useState<string>('top32_buyin_refund');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Preset Configurations
  const PRESETS: { [key: string]: Prize[] } = {
    top4_50: [
      { place: '1st', percent: 50.00, split: 1 },
      { place: '2nd', percent: 30.00, split: 1 },
      { place: '3rd-4th', percent: 20.00, split: 2 }
    ],
    top8_50: [
      { place: '1st', percent: 50.00, split: 1 },
      { place: '2nd', percent: 25.00, split: 1 },
      { place: '3rd-4th', percent: 15.00, split: 2 },
      { place: '5th-8th', percent: 10.00, split: 4 }
    ],
    top16_50: [
      { place: '1st', percent: 50.00, split: 1 },
      { place: '2nd', percent: 20.00, split: 1 },
      { place: '3rd-4th', percent: 10.00, split: 2 },
      { place: '5th-8th', percent: 10.00, split: 4 },
      { place: '9th-16th', percent: 10.00, split: 8 }
    ],
    top32_50: [
      { place: '1st', percent: 50.00, split: 1 },
      { place: '2nd', percent: 15.00, split: 1 },
      { place: '3rd-4th', percent: 10.00, split: 2 },
      { place: '5th-8th', percent: 10.00, split: 4 },
      { place: '9th-16th', percent: 10.00, split: 8 },
      { place: '17th-32nd', percent: 5.00, split: 16 }
    ],
    top4_30: [
      { place: '1st', percent: 30.00, split: 1 },
      { place: '2nd', percent: 30.00, split: 1 },
      { place: '3rd-4th', percent: 40.00, split: 2 }
    ],
    top8_30: [
      { place: '1st', percent: 30.00, split: 1 },
      { place: '2nd', percent: 20.00, split: 1 },
      { place: '3rd-4th', percent: 20.00, split: 2 },
      { place: '5th-8th', percent: 30.00, split: 4 }
    ],
    top16_30: [
      { place: '1st', percent: 30.00, split: 1 },
      { place: '2nd', percent: 15.00, split: 1 },
      { place: '3rd-4th', percent: 15.00, split: 2 },
      { place: '5th-8th', percent: 20.00, split: 4 },
      { place: '9th-16th', percent: 20.00, split: 8 }
    ],
    top32_30: [
      { place: '1st', percent: 30.00, split: 1 },
      { place: '2nd', percent: 15.00, split: 1 },
      { place: '3rd-4th', percent: 10.00, split: 2 },
      { place: '5th-8th', percent: 15.00, split: 4 },
      { place: '9th-16th', percent: 15.00, split: 8 },
      { place: '17th-32nd', percent: 15.00, split: 16 }
    ],
    top4_buyin_refund: [
      { place: '1st', percent: 50.00, split: 1 },
      { place: '2nd', percent: 25.00, split: 1 },
      { place: '3rd-4th', percent: 25.00, split: 2 }
    ]
  };

  const createRanks = (n: number): Ranks[] => {
    if (n === 4) return [{ place: '1st', split: 1 }, { place: '2nd', split: 1 }, { place: '3rd-4th', split: 2 }];
    if (n === 8) return [{ place: '1st', split: 1 }, { place: '2nd', split: 1 }, { place: '3rd-4th', split: 2 }, { place: '5th-8th', split: 4 }];
    if (n === 16) return [{ place: '1st', split: 1 }, { place: '2nd', split: 1 }, { place: '3rd-4th', split: 2 }, { place: '5th-8th', split: 4 }, { place: '9th-16th', split: 8 }];
    if (n === 32) return [{ place: '1st', split: 1 }, { place: '2nd', split: 1 }, { place: '3rd-4th', split: 2 }, { place: '5th-8th', split: 4 }, { place: '9th-16th', split: 8 }, { place: '17th-32nd', split: 16 }];
    return [];
  };

  const roundToNearestDollar = (amount: number): number => Math.round(amount);

  const getStartRank = (place: string): number => {
    const match = place.match(/^(\d+)/);
    return match ? parseInt(match[1]) : Infinity;
  };

  const sortPrizes = (a: Prize, b: Prize): number => {
    const rankA = getStartRank(a.place);
    const rankB = getStartRank(b.place);
    if (rankA < rankB) return -1;
    if (rankA > rankB) return 1;
    return 0;
  };

  const getDisplayRankLabel = (place: string, split: number): string => {
    if (split === 1) return place;
    const match = place.match(/^(\d+)(st|nd|rd|th)/);
    if (match) return `Jnt ${match[0]}`;
    return place;
  };

  const calculatePrizes = () => {
    const grossPool = entryFee * numPlayers;
    
    const effectiveDartConnectFee = enableDartConnectFee ? dartConnectFee : 0;
    const effectiveHighScoreCont = enableHighScoreCont ? highScoreCont : 0;
    const effectiveHighFinishCont = enableHighFinishCont ? highFinishCont : 0;

    const totalDeductionPerPlayer = effectiveDartConnectFee + effectiveHighScoreCont + effectiveHighFinishCont;
    const netEntryFee = Math.max(0, entryFee - totalDeductionPerPlayer);
    const netMainPrizePool = netEntryFee * numPlayers;

    const totalDartConnectFee = effectiveDartConnectFee * numPlayers;
    const totalHighScorePool = effectiveHighScoreCont * numPlayers;
    const totalHighFinishPool = effectiveHighFinishCont * numPlayers;

    const sortedPrizes = [...prizes].sort(sortPrizes);

    let totalUnroundedAmount = 0;
    let totalRoundedAmount = 0;
    const prizeData: PrizeData[] = [];

    sortedPrizes.forEach((prize) => {
      const percent = parseFloat(prize.percent.toString()) || 0;
      const split = prize.split || 1;
      
      const unroundedAmount = (netMainPrizePool * (percent / 100));
      const roundedAmount = roundToNearestDollar(unroundedAmount);

      totalUnroundedAmount += unroundedAmount;
      totalRoundedAmount += roundedAmount;
      
      prizeData.push({
        ...prize,
        unroundedAmount,
        roundedAmount
      });
    });

    let finalTotalAllocated = totalRoundedAmount;
    
    if (Math.abs(totalUnroundedAmount - netMainPrizePool) < 0.01 && prizeData.length > 0) {
      const totalRoundingDifference = netMainPrizePool - totalRoundedAmount;
      let correctionIndex = prizeData.reduce((maxIndex, currentPrize, index, arr) => 
        currentPrize.roundedAmount > arr[maxIndex].roundedAmount ? index : maxIndex, 0);
      prizeData[correctionIndex].correctedAmount = prizeData[correctionIndex].roundedAmount + totalRoundingDifference;
      finalTotalAllocated = netMainPrizePool;
    }

    const finalPercentAllocated = sortedPrizes.reduce((sum, prize) => sum + (parseFloat(prize.percent.toString()) || 0), 0);
    const remainingPool = netMainPrizePool - finalTotalAllocated;

    setCalculationResult({
      grossPool,
      netMainPrizePool,
      totalDartConnectFee,
      totalHighScorePool,
      totalHighFinishPool,
      prizeData,
      finalTotalAllocated,
      finalPercentAllocated,
      remainingPool
    });
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'top4_buyin_refund') {
      setPrizes(PRESETS[presetName].map(p => ({ ...p })));
    } else if (presetName.endsWith('_buyin_refund')) {
      const n = parseInt(presetName.match(/\d+/)![0]);
      const ranks = createRanks(n);
      const numRefundPlayers = ranks[ranks.length - 1].split;
      const totalRefundAmount = numRefundPlayers * entryFee;

      const effectiveDartConnectFee = enableDartConnectFee ? dartConnectFee : 0;
      const effectiveHighScoreCont = enableHighScoreCont ? highScoreCont : 0;
      const effectiveHighFinishCont = enableHighFinishCont ? highFinishCont : 0;

      const totalDeductionPerPlayer = effectiveDartConnectFee + effectiveHighScoreCont + effectiveHighFinishCont;
      const netEntryFee = Math.max(0, entryFee - totalDeductionPerPlayer);
      const netMainPrizePool = netEntryFee * numPlayers;

      if (netMainPrizePool === 0) {
        setPrizes([]);
        return;
      }

      const lastPercent = (totalRefundAmount / netMainPrizePool) * 100;
      const remainingPercent = 100 - lastPercent;

      const ratios: { [key: string]: number[] } = {
        'top8': [30.00, 20.00, 20.00],
        'top16': [30.00, 15.00, 15.00, 20.00],
        'top32': [30.00, 15.00, 10.00, 15.00, 15.00],
      };
      const ratioKey = presetName.substring(0, presetName.indexOf('_'));
      const baseRatios = ratios[ratioKey] || [];
      const baseRatioTotal = baseRatios.reduce((sum, ratio) => sum + ratio, 0);

      let newPrizes: Prize[] = [];

      if (baseRatioTotal > 0 && remainingPercent > 0) {
        for (let i = 0; i < baseRatios.length; i++) {
          const scaledPercent = (baseRatios[i] / baseRatioTotal) * remainingPercent;
          newPrizes.push({ place: ranks[i].place, percent: scaledPercent, split: ranks[i].split });
        }
      }

      if (lastPercent > 0) {
        newPrizes.push({ place: ranks[ranks.length - 1].place, percent: lastPercent, split: ranks[ranks.length - 1].split });
      }

      setPrizes(newPrizes);
    } else {
      setPrizes(PRESETS[presetName]?.map(p => ({ ...p })) || []);
    }
  };

  const updatePlayerRecommendation = () => {
    let recommendation = '';
    let preset = '';

    if (numPlayers < 4) {
      recommendation = 'Enter 4 or more players to get a recommendation.';
    } else if (numPlayers >= 4 && numPlayers <= 16) {
      preset = 'Top 4';
    } else if (numPlayers >= 17 && numPlayers <= 54) {
      preset = 'Top 8';
    } else if (numPlayers >= 55 && numPlayers <= 100) {
      preset = 'Top 16';
    } else if (numPlayers >= 101) {
      preset = 'Top 32';
    }

    if (preset) {
      recommendation = `✅ Recommended Payout: ${preset} (30% winner, last position money back)`;
    }

    return recommendation;
  };

  const updatePrizePercent = (index: number, value: string) => {
    const newPrizes = [...prizes];
    newPrizes[index].percent = parseFloat(value) || 0;
    setPrizes(newPrizes);
  };

  const removePlace = (index: number) => {
    const newPrizes = [...prizes];
    newPrizes.splice(index, 1);
    setPrizes(newPrizes);
  };

  const addPlace = () => {
    setPrizes([...prizes, { place: 'New Place', percent: 0, split: 1 }]);
  };

  const clearPrizes = () => {
    if (window.confirm('Are you sure you want to clear all prizes?')) {
      setPrizes([]);
    }
  };

  // Initialize with default preset on mount
  useEffect(() => {
    applyPreset('top32_buyin_refund');
  }, []);

  // Recalculate whenever any input changes
  useEffect(() => {
    calculatePrizes();
  }, [entryFee, numPlayers, prizes, enableDartConnectFee, dartConnectFee, enableHighScoreCont, highScoreCont, enableHighFinishCont, highFinishCont]);

  const recommendation = updatePlayerRecommendation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="glass-card inline-flex items-center gap-4 px-8 py-4 mb-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">💰</span>
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-200 to-purple-300 bg-clip-text text-transparent">
              PayCal
            </h1>
          </div>
          <p className="text-lg text-gray-300">Professional Prize Pool Calculator</p>
        </div>

        {/* Input Section */}
        <div className="glass-card p-6 mb-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Entry Fee & Players */}
            <div className="space-y-4">
              <div>
                <label htmlFor="entryFee" className="block text-sm font-medium text-blue-300 mb-2">Entry Fee ($)</label>
                <input
                  type="number"
                  id="entryFee"
                  value={entryFee}
                  onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-900/80 border border-gray-600 rounded-lg text-white p-3 text-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="numPlayers" className="block text-sm font-medium text-blue-300 mb-2">Number of Players</label>
                <input
                  type="number"
                  id="numPlayers"
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full bg-gray-900/80 border border-gray-600 rounded-lg text-white p-3 text-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {recommendation && (
                <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                  <p className="text-sm text-green-300" dangerouslySetInnerHTML={{ __html: recommendation }} />
                </div>
              )}
            </div>

            {/* Deductions */}
            <div className="glass-card p-4 border-red-500/50 bg-red-900/20 backdrop-blur-sm rounded-lg">
              <h3 className="text-base font-bold text-red-300 mb-3">Side Pools & Deductions (per player)</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableDartConnectFee"
                      checked={enableDartConnectFee}
                      onChange={(e) => setEnableDartConnectFee(e.target.checked)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enableDartConnectFee" className="text-red-200 font-medium">DartConnect Fee</label>
                  </div>
                  <input
                    type="number"
                    value={dartConnectFee}
                    onChange={(e) => setDartConnectFee(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-20 text-right bg-gray-900 border border-gray-700 rounded-lg text-white p-1.5 text-sm focus:ring-red-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableHighScoreCont"
                      checked={enableHighScoreCont}
                      onChange={(e) => setEnableHighScoreCont(e.target.checked)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enableHighScoreCont" className="text-red-200 font-medium">High Score</label>
                  </div>
                  <input
                    type="number"
                    value={highScoreCont}
                    onChange={(e) => setHighScoreCont(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-20 text-right bg-gray-900 border border-gray-700 rounded-lg text-white p-1.5 text-sm focus:ring-red-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableHighFinishCont"
                      checked={enableHighFinishCont}
                      onChange={(e) => setEnableHighFinishCont(e.target.checked)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enableHighFinishCont" className="text-red-200 font-medium">High Finish</label>
                  </div>
                  <input
                    type="number"
                    value={highFinishCont}
                    onChange={(e) => setHighFinishCont(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-20 text-right bg-gray-900 border border-gray-700 rounded-lg text-white p-1.5 text-sm focus:ring-red-500"
                  />
                </div>
              </div>
              {calculationResult && (
                <div className="border-t border-red-700/50 pt-3 mt-3 space-y-1 text-xs">
                  <p className="flex justify-between text-red-100">
                    <span>DC Fees:</span>
                    <strong className="text-red-300">${calculationResult.totalDartConnectFee.toFixed(2)}</strong>
                  </p>
                  <p className="flex justify-between text-red-100">
                    <span>High Score Pool:</span>
                    <strong className="text-red-300">${calculationResult.totalHighScorePool.toFixed(2)}</strong>
                  </p>
                  <p className="flex justify-between text-red-100">
                    <span>High Finish Pool:</span>
                    <strong className="text-red-300">${calculationResult.totalHighFinishPool.toFixed(2)}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pool Display */}
          {calculationResult && (
            <div className="glass-card p-4 border-indigo-500/50 backdrop-blur-sm rounded-lg text-center">
              <p className="text-xs font-medium text-indigo-300 mb-2">Net Main Prize Pool</p>
              <p className="text-3xl font-bold text-green-400">${calculationResult.netMainPrizePool.toFixed(2)}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">
                (Gross Pool: ${calculationResult.grossPool.toFixed(2)})
              </p>
            </div>
          )}
        </div>

        {/* Preset Buttons */}
        <div className="glass-card p-6 mb-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
          <h2 className="text-xl font-bold mb-4 text-gray-200">Quick Preset Configurations</h2>
          
          {/* 50% Winner Presets */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-green-300 mb-3">50% Winner Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['top4_50', 'top8_50', 'top16_50', 'top32_50'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className="btn bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg text-sm"
                >
                  {preset.replace('_', ' ').replace('50', ' - 50%')}
                </button>
              ))}
            </div>
          </div>

          {/* 30% Winner Presets */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-blue-300 mb-3">30% Winner Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['top4_30', 'top8_30', 'top16_30', 'top32_30'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className="btn bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3 px-4 rounded-lg text-sm"
                >
                  {preset.replace('_', ' ').replace('30', ' - 30%')}
                </button>
              ))}
            </div>
          </div>

          {/* Money Back Presets */}
          <div>
            <h3 className="text-base font-semibold text-yellow-300 mb-3">Money Back Presets (30% Winner)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['top4_buyin_refund', 'top8_buyin_refund', 'top16_buyin_refund', 'top32_buyin_refund'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className="btn bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-lg text-sm"
                >
                  {preset.replace('_buyin_refund', ' Money Back')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prize Breakdown */}
        <div className="glass-card p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
          <h2 className="text-xl font-bold mb-4 text-gray-200 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Main Prize Breakdown
          </h2>

          {/* Manual Controls */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={addPlace}
              className="btn bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Add Place
            </button>
            <button
              onClick={clearPrizes}
              className="btn bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Clear All
            </button>
          </div>

          {/* Prize List */}
          <div className="space-y-3 mb-8">
            {calculationResult?.prizeData?.map((data: PrizeData, index: number) => {
              const amount = data.correctedAmount !== undefined ? data.correctedAmount : data.roundedAmount;
              const individualPayout = amount / (data.split || 1);
              const displayRank = getDisplayRankLabel(data.place, data.split);
              const numEnvelopes = data.split || 1;
              const envelopeText = numEnvelopes === 1 ? `${numEnvelopes} Envelope` : `${numEnvelopes} Envelopes`;

              return (
                <div key={index} className="prize-row glass-card p-4 rounded-lg border border-gray-600 backdrop-blur-sm bg-white/5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <span className="badge bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {displayRank}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={data.percent.toFixed(2)}
                          onChange={(e) => updatePrizePercent(index, e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-20 text-center bg-gray-900 border border-gray-600 rounded-lg text-white p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-400 font-semibold">%</span>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>
                      </svg>
                      {envelopeText}
                    </div>
                    
                    <div className="flex items-center gap-6 ml-auto">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-semibold text-white">${amount.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Per Player</p>
                        <p className="text-xl font-bold text-green-400">${individualPayout.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removePlace(index)}
                        className="btn bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="md:hidden w-full text-xs text-gray-400 flex items-center gap-1 pt-2 border-t border-gray-700">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>
                      </svg>
                      {envelopeText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Allocation Summary */}
          {calculationResult && (
            <div className="glass-card p-6 border-indigo-500/50 backdrop-blur-sm bg-white/5 rounded-lg">
              <h3 className="text-lg font-bold text-gray-200 mb-4">Total Allocation</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total % Allocated:</span>
                  <span className={`text-xl font-bold ${Math.abs(calculationResult.finalPercentAllocated - 100) < 0.01 ? 'text-green-400' : 'text-red-500'}`}>
                    {calculationResult.finalPercentAllocated.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total $ Allocated:</span>
                  <span className={`text-xl font-bold ${Math.abs(calculationResult.remainingPool) < 0.01 ? 'text-green-400' : 'text-red-500'}`}>
                    ${calculationResult.finalTotalAllocated.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-600">
                  <span className="text-base font-bold text-gray-200">Remaining Net Pool:</span>
                  <span className={`text-2xl font-extrabold ${Math.abs(calculationResult.remainingPool) < 0.01 ? 'text-green-400' : 'text-red-500'}`}>
                    ${calculationResult.remainingPool.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="glass-card p-6 mt-8 border-yellow-500/50 bg-yellow-900/20 backdrop-blur-xl rounded-2xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div className="text-sm text-yellow-100">
              <p className="font-bold mb-2 text-yellow-200">⚠️ IMPORTANT DISCLAIMER</p>
              <p className="mb-3">This calculator is for <strong>RECOMMENDATION</strong> purposes only. The Tournament Director and Payout Committee have the final say. Always verify numbers before use.</p>
              <p className="font-semibold mb-2 text-yellow-200">Calculation Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs ml-4">
                <li>Assumes 100% payout of Net Main Prize Pool</li>
                <li>Net pool calculated after deducting enabled fees</li>
                <li>Amounts rounded to nearest dollar with difference applied to largest prize</li>
              </ul>
              <p className="mt-3 text-xs text-yellow-300"><strong>CGCDarts.com is not responsible</strong> for any miscalculated prize payouts or discrepancies.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 mb-4">
          <p className="text-sm text-gray-500">Designed by <span className="text-indigo-400 font-semibold">MDstudios</span> for <span className="text-indigo-400 font-semibold">CGCDarts.com</span></p>
          <p className="text-xs text-gray-600 mt-2">Compatible with Windows, macOS, iOS, and Android</p>
        </div>
      </div>
    </div>
  );
};

export default Paycal;