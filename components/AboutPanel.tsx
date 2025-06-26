
import React from 'react';
import { APP_VERSION, CONTACT_EMAIL } from '../constants';
import { NutriKickIcon } from './Icons';

export const AboutPanel: React.FC = () => {
  return (
    <div className="p-4 md:p-6 bg-slate-700 text-slate-200 min-h-full animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <NutriKickIcon className="text-5xl text-orange-500 mr-3" />
          <h2 className="text-3xl font-semibold text-slate-100">
            Acerca de Nutri-Kick AI
          </h2>
        </div>

        <div className="bg-slate-800 shadow-xl rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-orange-400 mb-3">¿Qué es Nutri-Kick AI?</h3>
          <p className="text-slate-300 leading-relaxed">
            Nutri-Kick AI es tu asistente inteligente de nutrición deportiva y rendimiento. Diseñado para ofrecerte información basada en evidencia científica, ayudarte a comprender tus necesidades nutricionales y motivarte a alcanzar tus objetivos de salud y deportivos.
          </p>
        </div>

        <div className="bg-slate-800 shadow-xl rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-orange-400 mb-3">Características Principales</h3>
          <ul className="list-disc list-inside text-slate-300 space-y-2 pl-4">
            <li>Asesoramiento nutricional general y deportivo.</li>
            <li>Estimación de requerimientos calóricos y macronutrientes (para usuarios registrados).</li>
            <li>Registro de ingesta alimentaria mediante texto, voz o imagen (próximamente para usuarios registrados).</li>
            <li>Check-in diario para un seguimiento más cercano de tu bienestar.</li>
            {/* Removed: <li>Panel de administración para gestión de usuarios.</li> */}
          </ul>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-800 shadow-xl rounded-lg p-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">Versión y Plataforma</h3>
            <p className="text-slate-300">
                <strong>Versión:</strong> {APP_VERSION}
            </p>
            <p className="text-slate-300 mt-1">
                <strong>Plataforma:</strong> PWA (Progressive Web App) - Funciona en web y se puede instalar en dispositivos.
            </p>
            </div>
            <div className="bg-slate-800 shadow-xl rounded-lg p-6">
            <h3 className="text-xl font-semibold text-orange-400 mb-3">Contacto y Soporte</h3>
            <p className="text-slate-300">
                Para preguntas o soporte, contáctanos en:
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-orange-400 hover:text-orange-300 underline break-all">
                {CONTACT_EMAIL}
            </a>
            </div>
        </div>

        {/* Sección de Créditos Eliminada */}

        <p className="text-center text-xs text-slate-500 mt-8">
          Nutri-Kick AI - Potenciando tu rendimiento.
        </p>
      </div>
    </div>
  );
};
