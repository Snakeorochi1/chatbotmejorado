
import React, { useState, useEffect } from 'react';
import { fetchAllUserProfilesForAdmin } from '../services/supabaseService';
import { AdminUserView } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { UserIcon, ProfileIcon, ChartBarIcon } from './Icons'; // Added more icons

interface ProfileStats {
  totalUsers: number;
  athletesCount: number;
  athletesPercentage: string;
  nonAthletesCount: number;
  nonAthletesPercentage: string;
  genderDefinedCount: number;
  genderDefinedPercentage: string;
  genderUndefinedCount: number;
  genderUndefinedPercentage: string;
  goalDefinedCount: number;
  goalDefinedPercentage: string;
  goalUndefinedCount: number;
  goalUndefinedPercentage: string;
  averageAge: string;
}

const calculateProfileStats = (usersData: AdminUserView[]): ProfileStats => {
  if (!usersData || usersData.length === 0) {
    return {
      totalUsers: 0,
      athletesCount: 0, athletesPercentage: '0.0',
      nonAthletesCount: 0, nonAthletesPercentage: '0.0',
      genderDefinedCount: 0, genderDefinedPercentage: '0.0',
      genderUndefinedCount: 0, genderUndefinedPercentage: '0.0',
      goalDefinedCount: 0, goalDefinedPercentage: '0.0',
      goalUndefinedCount: 0, goalUndefinedPercentage: '0.0',
      averageAge: 'N/A',
    };
  }

  const totalUsers = usersData.length;

  const athletesCount = usersData.filter(u => u.is_athlete === true).length;
  const nonAthletesCount = usersData.filter(u => u.is_athlete === false).length; 
  // Note: is_athlete in user_profiles is NOT NULL and defaults to false. So users are either true or false.

  const genderDefinedCount = usersData.filter(u => u.gender && u.gender.trim() !== "").length;
  const genderUndefinedCount = totalUsers - genderDefinedCount;

  const goalDefinedCount = usersData.filter(u => u.goals && u.goals.trim() !== "").length;
  const goalUndefinedCount = totalUsers - goalDefinedCount;
  
  let sumOfAges = 0;
  let countOfUsersWithAge = 0;
  usersData.forEach(u => {
    if (u.age) {
      const ageNum = parseInt(u.age, 10);
      if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) { // Basic validation
        sumOfAges += ageNum;
        countOfUsersWithAge++;
      }
    }
  });
  const averageAgeNum = countOfUsersWithAge > 0 ? (sumOfAges / countOfUsersWithAge) : null;

  return {
    totalUsers,
    athletesCount,
    athletesPercentage: totalUsers > 0 ? ((athletesCount / totalUsers) * 100).toFixed(1) : '0.0',
    nonAthletesCount,
    nonAthletesPercentage: totalUsers > 0 ? ((nonAthletesCount / totalUsers) * 100).toFixed(1) : '0.0',
    genderDefinedCount,
    genderDefinedPercentage: totalUsers > 0 ? ((genderDefinedCount / totalUsers) * 100).toFixed(1) : '0.0',
    genderUndefinedCount,
    genderUndefinedPercentage: totalUsers > 0 ? ((genderUndefinedCount / totalUsers) * 100).toFixed(1) : '0.0',
    goalDefinedCount,
    goalDefinedPercentage: totalUsers > 0 ? ((goalDefinedCount / totalUsers) * 100).toFixed(1) : '0.0',
    goalUndefinedCount,
    goalUndefinedPercentage: totalUsers > 0 ? ((goalUndefinedCount / totalUsers) * 100).toFixed(1) : '0.0',
    averageAge: averageAgeNum ? `${averageAgeNum.toFixed(1)} años` : 'N/A',
  };
};


export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [stats, setStats] = useState<ProfileStats>(calculateProfileStats([]));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsersAndStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedUsers = await fetchAllUserProfilesForAdmin();
        setUsers(fetchedUsers);
        setStats(calculateProfileStats(fetchedUsers));
      } catch (err: any) {
        console.error("Error fetching users for admin panel:", err);
        setError(err.message || "No se pudo cargar la lista de usuarios y estadísticas.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUsersAndStats();
  }, []);

  const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon?: React.ReactNode; colorClass?: string }> = 
    ({ title, value, subValue, icon, colorClass = "text-orange-400" }) => (
    <div className="bg-slate-800 p-4 rounded-lg shadow-md flex items-center space-x-3">
      {icon && <div className={`p-2 rounded-full bg-slate-700 ${colorClass}`}>{icon}</div>}
      <div>
        <h3 className="text-sm font-medium text-slate-400 truncate" title={title}>{title}</h3>
        <p className={`mt-1 text-2xl font-semibold ${colorClass}`}>{value}
          {subValue && <span className="ml-1 text-xs font-normal text-slate-300">({subValue})</span>}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-slate-700 text-slate-200 rounded-lg shadow-xl animate-fadeIn h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-semibold text-slate-100 mb-2 border-b pb-3 border-slate-600">
        Panel de Administración 🛡️
      </h2>
      
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <LoadingSpinner size="lg" color="text-orange-500" />
          <p className="ml-3 text-slate-300">Cargando datos del panel...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-700/30 border border-red-500 text-red-200 px-4 py-3 rounded-md my-6 shadow-md animate-fadeIn" role="alert">
          <p className="font-bold text-red-100">Error al cargar datos:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Statistics Section */}
          <h3 className="text-xl font-semibold text-slate-200 mt-4 mb-4">Resumen de Estadísticas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Usuarios" value={stats.totalUsers} icon={<UserIcon className="w-6 h-6"/>} />
            <StatCard title="Atletas" value={stats.athletesCount} subValue={`${stats.athletesPercentage}%`} icon={<ProfileIcon className="w-6 h-6"/>} colorClass="text-sky-400"/>
            <StatCard title="No Atletas" value={stats.nonAthletesCount} subValue={`${stats.nonAthletesPercentage}%`} icon={<ProfileIcon className="w-6 h-6"/>} colorClass="text-teal-400"/>
            <StatCard title="Género Sin Definir" value={stats.genderUndefinedCount} subValue={`${stats.genderUndefinedPercentage}%`} icon={<ProfileIcon className="w-6 h-6"/>} colorClass="text-slate-400"/>
            <StatCard title="Objetivo Sin Definir" value={stats.goalUndefinedCount} subValue={`${stats.goalUndefinedPercentage}%`} icon={<ProfileIcon className="w-6 h-6"/>} colorClass="text-slate-400"/>
            <StatCard title="Edad Promedio" value={stats.averageAge} icon={<ChartBarIcon className="w-6 h-6"/>} colorClass="text-purple-400"/>
          </div>

          {/* Users Table Section */}
          <h3 className="text-xl font-semibold text-slate-200 mb-4">Lista de Usuarios Registrados</h3>
          {users.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 text-lg">No hay usuarios registrados actualmente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar rounded-lg shadow-md border border-slate-600">
              <table className="min-w-full divide-y divide-slate-600 bg-slate-800">
                <thead className="bg-slate-900/70">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-orange-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-orange-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-orange-400 uppercase tracking-wider hidden sm:table-cell">
                      ID Usuario
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-orange-400 uppercase tracking-wider hidden md:table-cell">
                      Última Actualización
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">
                        {user.name || <span className="text-slate-400 italic">No especificado</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                        {user.email || <span className="text-slate-400 italic">No especificado</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 hidden sm:table-cell truncate max-w-xs" title={user.id}>
                        {user.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 hidden md:table-cell">
                        {user.last_updated_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            