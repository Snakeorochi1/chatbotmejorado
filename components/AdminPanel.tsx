

import React, { useState, useEffect } from 'react';
import { fetchAllUserProfilesForAdmin } from '../services/supabaseService';
import { AdminUserView } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { UserIcon, ProfileIcon, ChartBarIcon } from './Icons'; // Added

// Added export here
export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof AdminUserView; direction: 'ascending' | 'descending' } | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedUsers = await fetchAllUserProfilesForAdmin();
        setUsers(fetchedUsers);
      } catch (err: any) {
        setError(err.message || 'Error al cargar usuarios.');
        console.error("AdminPanel Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSort = (key: keyof AdminUserView) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...users];
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        // Special handling for age (numeric sort)
        if (sortConfig.key === 'age') {
            const aAge = parseInt(a.age || '0');
            const bAge = parseInt(b.age || '0');
             if (aAge < bAge) return sortConfig.direction === 'ascending' ? -1 : 1;
             if (aAge > bAge) return sortConfig.direction === 'ascending' ? 1 : -1;
             return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return (aValue === bValue ? 0 : aValue ? -1 : 1) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
         if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        // Fallback for dates or other types if necessary
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableUsers;
  }, [users, sortConfig]);

  const filteredUsers = sortedUsers.filter(user => {
    const nameMatch = user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || emailMatch;
  });

  const getSortIndicator = (key: keyof AdminUserView) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const commonThClasses = "px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer select-none";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8 bg-slate-700">
        <LoadingSpinner size="lg" color="text-orange-500" />
        <p className="ml-4 text-slate-300">Cargando datos de usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-slate-700 text-center">
        <p className="text-red-400 text-lg">Error al cargar datos:</p>
        <p className="text-red-300 bg-red-900/50 p-3 rounded-md mt-2">{error}</p>
        <p className="text-xs text-slate-500 mt-3">Asegúrate de que las políticas RLS de Supabase permitan al administrador leer la tabla 'user_profiles'.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-800 text-slate-200 min-h-full animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-700">
        <h2 className="text-2xl font-semibold text-slate-100 flex items-center">
          <ChartBarIcon className="w-7 h-7 mr-2 text-purple-400"/>
          Panel de Administración de Usuarios
        </h2>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-3 sm:mt-0 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm placeholder-slate-400"
        />
      </div>
      
      {filteredUsers.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <UserIcon className="w-16 h-16 mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron usuarios.</p>
          {searchTerm && <p className="text-slate-500 text-sm">Prueba con otro término de búsqueda.</p>}
        </div>
      )}

      {filteredUsers.length > 0 && (
        <div className="overflow-x-auto shadow-xl rounded-lg bg-slate-700 custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-600">
            <thead className="bg-slate-700 sticky top-0">
              <tr>
                <th scope="col" className={`${commonThClasses}`} onClick={() => handleSort('name')}>
                  Nombre {getSortIndicator('name')}
                </th>
                <th scope="col" className={`${commonThClasses}`} onClick={() => handleSort('email')}>
                  Email {getSortIndicator('email')}
                </th>
                 <th scope="col" className={`${commonThClasses} hidden md:table-cell`} onClick={() => handleSort('age')}>
                  Edad {getSortIndicator('age')}
                </th>
                <th scope="col" className={`${commonThClasses} hidden sm:table-cell`} onClick={() => handleSort('is_athlete')}>
                  Atleta {getSortIndicator('is_athlete')}
                </th>
                <th scope="col" className={`${commonThClasses} hidden lg:table-cell`} onClick={() => handleSort('gender')}>
                  Género {getSortIndicator('gender')}
                </th>
                <th scope="col" className={`${commonThClasses} hidden md:table-cell`} onClick={() => handleSort('goals')}>
                  Objetivo Principal {getSortIndicator('goals')}
                </th>
                <th scope="col" className={`${commonThClasses} hidden lg:table-cell`} onClick={() => handleSort('last_updated_at')}>
                  Última Actualización {getSortIndicator('last_updated_at')}
                </th>
                <th scope="col" className={`${commonThClasses} text-center`}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-700 divide-y divide-slate-600">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-600/50 transition-colors duration-150">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{user.name || <span className="text-slate-400 italic">N/D</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{user.email || <span className="text-slate-400 italic">N/D</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 hidden md:table-cell">{user.age || <span className="text-slate-400 italic">N/D</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 hidden sm:table-cell">
                    {user.is_athlete === true ? 'Sí ✅' : (user.is_athlete === false ? 'No 🚫' : <span className="text-slate-400 italic">N/D</span>)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 hidden lg:table-cell">{user.gender || <span className="text-slate-400 italic">N/D</span>}</td>
                  <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate hidden md:table-cell" title={user.goals || ''}>{user.goals || <span className="text-slate-400 italic">N/D</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 hidden lg:table-cell">{user.last_updated_at || <span className="text-slate-400 italic">N/D</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
                    <button 
                        className="text-purple-400 hover:text-purple-300 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                        title="Ver Perfil Completo (Próximamente)"
                        disabled // Functionality not implemented yet
                    >
                      <ProfileIcon className="w-5 h-5"/>
                    </button>
                    {/* Placeholder for more actions */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500 mt-6 text-center">
        Total de usuarios en la vista actual: {filteredUsers.length}
      </p>
    </div>
  );
};