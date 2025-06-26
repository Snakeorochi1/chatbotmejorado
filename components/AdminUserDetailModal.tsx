
import React, { useState } from 'react';
import { UserProfile, Gender, SportsDiscipline, TrainingLoad, TrainingFrequency, PersonalGoal, AthleticGoalOptions, DietaryApproachOptions, DietaryRestrictionOptions, WellnessFocusAreaOptions, MoodTodayOptions, TrainedTodayOptions, HadBreakfastOptions, EnergyLevelOptions, SleepQualityOptions } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { TrashIcon, CloseIcon, ProfileIcon as UserProfileIcon } from './Icons'; // Renamed ProfileIcon to UserProfileIcon to avoid conflict

interface AdminUserDetailModalProps {
  user: UserProfile;
  userId: string; // The actual ID of the user (from user_profiles.id which is auth.uid())
  isOpen: boolean;
  onClose: () => void;
  onDelete: (userIdToDelete: string) => Promise<void>;
  isLoadingDelete: boolean;
  actionError: string | null;
}

const DetailItem: React.FC<{ label: string; value?: string | string[] | number | boolean | null | undefined; isBadge?: boolean; isList?: boolean }> = ({ label, value, isBadge, isList }) => {
  let displayValue: React.ReactNode = <span className="text-slate-400 italic">No especificado</span>;

  if (value !== null && value !== undefined && value !== '') {
    if (typeof value === 'boolean') {
      displayValue = value ? <span className="text-green-400 font-semibold">Sí</span> : <span className="text-red-400 font-semibold">No</span>;
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        displayValue = (
          <div className="flex flex-wrap gap-1 mt-1">
            {value.map((item, index) => (
              <span key={index} className="px-2 py-0.5 bg-slate-600 text-slate-200 text-xs rounded-full shadow-sm">
                {item}
              </span>
            ))}
          </div>
        );
      }
    } else if (isBadge) {
      displayValue = <span className="px-2 py-0.5 bg-blue-600 text-blue-100 text-xs rounded-full shadow-sm">{value.toString()}</span>;
    } 
     else if (label === "Último Check-in" && typeof value === 'number') {
        displayValue = new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short'});
    }
    else {
      displayValue = value.toString();
    }
  }

  return (
    <div className="py-2">
      <dt className="text-sm font-medium text-slate-400">{label}:</dt>
      <dd className={`mt-0.5 text-sm text-slate-100 ${isList && Array.isArray(value) && value.length > 0 ? '' : 'sm:col-span-2'}`}>
        {displayValue}
      </dd>
    </div>
  );
};


export const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({ user, userId, isOpen, onClose, onDelete, isLoadingDelete, actionError }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !user) return null;

  const handleDeleteClick = () => {
    if (confirm(`¿Estás seguro de que quieres eliminar el perfil de ${user.name || user.email || 'este usuario'}? Esta acción no se puede deshacer y solo borrará los datos del perfil, no la cuenta de autenticación.`)) {
      onDelete(userId); // Use the passed userId which is the actual ID
    }
  };
  
  const getSportDisciplineDisplay = () => {
    if (user.sportsDiscipline && user.sportsDiscipline !== SportsDiscipline.Other) {
        return user.sportsDiscipline;
    }
    if (user.sportsDiscipline === SportsDiscipline.Other && user.customSportsDiscipline) {
        return `${SportsDiscipline.Other} (${user.customSportsDiscipline})`;
    }
    return user.sportsDiscipline || undefined;
  };


  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose();}}
      role="dialog"
      aria-modal="true"
      aria-labelledby="userDetailModalTitle"
    >
      <div className="bg-slate-800 shadow-2xl rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="userDetailModalTitle" className="text-xl font-semibold text-slate-100 flex items-center">
            <UserProfileIcon className="w-6 h-6 mr-2 text-purple-400" />
            Detalles del Usuario: {user.name || user.email || 'N/A'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
            aria-label="Cerrar modal"
          >
            <CloseIcon className="w-5 h-5"/>
          </button>
        </header>

        <main className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {actionError && (
            <div className="p-3 bg-red-700/30 border border-red-500 text-red-300 rounded-md animate-fadeIn" role="alert">
              {actionError}
            </div>
          )}
          <dl className="divide-y divide-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <DetailItem label="ID de Usuario (Auth)" value={userId} />
                <DetailItem label="Nombre Completo" value={user.name} />
                <DetailItem label="Email" value={user.email} />
                <DetailItem label="Teléfono" value={user.phone} />
                <DetailItem label="Edad" value={user.age ? `${user.age} años` : undefined} />
                <DetailItem label="Peso" value={user.weight ? `${user.weight} kg` : undefined} />
                <DetailItem label="Altura" value={user.height ? `${user.height} cm` : undefined} />
                <DetailItem label="Género" value={user.gender as Gender} />
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-700">
                <h4 className="text-md font-semibold text-purple-300 mb-2">Actividad y Objetivos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="¿Es Atleta?" value={user.isAthlete} />
                    {user.isAthlete ? (
                        <>
                            <DetailItem label="Disciplina Deportiva" value={getSportDisciplineDisplay()} />
                            <DetailItem label="Posición/Rol" value={user.position} />
                            <DetailItem label="Carga de Entrenamiento" value={user.trainingLoad as TrainingLoad} />
                            <DetailItem label="Objetivos Atléticos" value={user.athleticGoals as AthleticGoalOptions[]} isList />
                        </>
                    ) : (
                        <>
                            <DetailItem label="Frecuencia de Entrenamiento" value={user.trainingFrequency as TrainingFrequency} />
                             <DetailItem label="Áreas de Enfoque en Bienestar" value={user.wellnessFocusAreas} isList />
                        </>
                    )}
                    <DetailItem label="Objetivo Principal (General)" value={user.goals as PersonalGoal} />
                </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-700">
                <h4 className="text-md font-semibold text-purple-300 mb-2">Nutrición y Suplementos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Enfoques Dietéticos" value={user.dietaryApproaches as DietaryApproachOptions[]} isList />
                    <DetailItem label="Restricciones Alimentarias" value={user.dietaryRestrictions as DietaryRestrictionOptions[]} isList />
                    <DetailItem label="Uso Actual de Suplementos" value={user.currentSupplementUsage} />
                    <DetailItem label="Detalles de Suplementos" value={user.supplementInterestOrUsageDetails} />
                </div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-700">
                <h4 className="text-md font-semibold text-purple-300 mb-2">Check-in Diario (Último Registro)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <DetailItem label="Último Check-in" value={user.lastCheckInTimestamp} />
                    <DetailItem label="Ánimo" value={user.moodToday as MoodTodayOptions} />
                    <DetailItem label="Entrenamiento Realizado" value={user.trainedToday as TrainedTodayOptions} />
                    <DetailItem label="Desayuno" value={user.hadBreakfast as HadBreakfastOptions} />
                    <DetailItem label="Nivel de Energía" value={user.energyLevel as EnergyLevelOptions} />
                    <DetailItem label="Horas de Sueño" value={user.sleepHours} />
                    <DetailItem label="Calidad del Sueño" value={user.sleepQuality as SleepQualityOptions} />
                </div>
            </div>
          </dl>
        </main>

        <footer className="p-4 border-t border-slate-700 flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <button 
            type="button" 
            onClick={handleDeleteClick}
            disabled={isLoadingDelete}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md shadow-sm text-red-300 bg-red-700/30 hover:bg-red-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingDelete ? <LoadingSpinner size="sm" color="text-red-300" /> : <TrashIcon className="w-5 h-5 mr-2" />}
            {isLoadingDelete ? 'Eliminando...' : 'Eliminar Perfil'}
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-slate-100 bg-slate-600 hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-colors"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};
