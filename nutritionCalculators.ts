
import { UserProfile, Gender, PersonalGoal, NutrientTargets } from './types';

const HEALTHY_BMI_MIN = 18.5;
const HEALTHY_BMI_MAX = 24.9;
const TARGET_BMI_FOR_IDEAL_WEIGHT = 22; // Mid-point for a single "ideal" value

/**
 * Calculates a healthy body weight range and a target ideal body weight.
 * Uses BMI ranges. Height must be in cm.
 * Returns null if height is invalid.
 */
export const calculateIdealBodyWeightRange = (
  heightCm: number
): { min: number; max: number; ideal: number } | null => {
  if (heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const minWeight = HEALTHY_BMI_MIN * (heightM * heightM);
  const maxWeight = HEALTHY_BMI_MAX * (heightM * heightM);
  const idealWeight = TARGET_BMI_FOR_IDEAL_WEIGHT * (heightM * heightM);
  return {
    min: parseFloat(minWeight.toFixed(1)),
    max: parseFloat(maxWeight.toFixed(1)),
    ideal: parseFloat(idealWeight.toFixed(1)),
  };
};

/**
 * Calculates target daily macronutrients in grams.
 * TDEE must be provided.
 * Protein calculation for muscle gain uses ideal body weight if possible, otherwise current weight.
 */
export const calculateMacronutrientTargets = (
  userProfile: UserProfile,
  tdee: number | null
): NutrientTargets => {
  if (!tdee || tdee <= 0) {
    return { calories: tdee, protein: null, carbs: null, fats: null };
  }

  let targetProteinGrams: number | null = null;
  let targetCarbsGrams: number | null = null;
  let targetFatsGrams: number | null = null;

  const weightKg = parseFloat(userProfile.weight);
  const heightCm = parseInt(userProfile.height);

  // Protein calculation
  if (userProfile.goals === PersonalGoal.GainMuscleImproveComposition) { // Updated to new enum value
    let weightForProteinCalcKg = weightKg; // Default to current weight
    if (heightCm > 0) {
      const ibwData = calculateIdealBodyWeightRange(heightCm);
      if (ibwData) {
        weightForProteinCalcKg = ibwData.ideal; // Use ideal weight
      }
    }
    // Target 1.6 to 2.2 g/kg. Let's use an average of 1.9g/kg for calculation.
    targetProteinGrams = parseFloat((weightForProteinCalcKg * 1.9).toFixed(0));
  } else {
    // General recommendation: 0.8-1.2g/kg of current body weight, or ~15-20% of calories
    // For simplicity, let's take 20% of TDEE for protein for other goals.
     if (weightKg > 0) {
        targetProteinGrams = parseFloat((weightKg * 1.2).toFixed(0)); // Example: 1.2g/kg
     } else {
        targetProteinGrams = parseFloat(((tdee * 0.20) / 4).toFixed(0)); // 4 kcal per gram of protein
     }
  }

  // Fat calculation (e.g., 25% of TDEE)
  const fatCalories = tdee * 0.25;
  targetFatsGrams = parseFloat((fatCalories / 9).toFixed(0)); // 9 kcal per gram of fat

  // Carbohydrate calculation (remaining calories)
  if (targetProteinGrams !== null && targetFatsGrams !== null) {
    const proteinCalories = targetProteinGrams * 4;
    const carbsCalories = tdee - proteinCalories - fatCalories;
    targetCarbsGrams = parseFloat((carbsCalories / 4).toFixed(0)); // 4 kcal per gram of carbs
    
    // Ensure carbs are not negative if protein/fat targets are very high relative to TDEE
    if (targetCarbsGrams < 0) targetCarbsGrams = 0;
  }
  
  return {
    calories: tdee,
    protein: targetProteinGrams,
    carbs: targetCarbsGrams,
    fats: targetFatsGrams,
  };
};