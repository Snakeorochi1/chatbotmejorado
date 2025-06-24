
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

// =====================================================================================
// ¡CONFIGURACIÓN REQUERIDA POR EL USUARIO!
// Copia tu URL de Supabase y tu Clave Anónima (Anon Key) aquí abajo.
// Las obtienes del panel de tu proyecto en Supabase: Configuración del Proyecto > API.
//
// Ejemplo:
// const YOUR_SUPABASE_URL = "https://abcdefghijklmnop.supabase.co";
// const YOUR_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV....";
// =====================================================================================
const YOUR_SUPABASE_URL: string = "https://ztqdbvpcfutknsxtqfwu.supabase.co";
const YOUR_SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cWRidnBjZnV0a25zeHRxZnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODE1NTAsImV4cCI6MjA2NjM1NzU1MH0.8M_GZ2xbiTrNttqpaffHZ-IVDkZ6dp1DI2Ft3Bz7ho";
// =====================================================================================

let supabase: SupabaseClient | null = null;
let supabaseInitializationError: Error | null = null;

export type SupabaseServiceStatus = {
  clientInitialized: boolean;
  error: Error | null;
  detailedMessage?: string;
};

if (!YOUR_SUPABASE_URL || YOUR_SUPABASE_URL === "COPIA_AQUÍ_TU_SUPABASE_URL" || YOUR_SUPABASE_URL.length < 15) {
  supabaseInitializationError = new Error("La URL de Supabase no está configurada o es inválida. Edita services/supabaseService.ts y reemplaza 'COPIA_AQUÍ_TU_SUPABASE_URL' con tu URL real.");
  console.error(`%c${supabaseInitializationError.message}`, "color: red; font-weight: bold; font-size: 14px;");
} else if (!YOUR_SUPABASE_ANON_KEY || YOUR_SUPABASE_ANON_KEY === "COPIA_AQUÍ_TU_SUPABASE_ANON_KEY" || YOUR_SUPABASE_ANON_KEY.length < 30) {
  supabaseInitializationError = new Error("La Clave Anónima (Anon Key) de Supabase no está configurada o es inválida. Edita services/supabaseService.ts y reemplaza 'COPIA_AQUÍ_TU_SUPABASE_ANON_KEY' con tu clave real.");
  console.error(`%c${supabaseInitializationError.message}`, "color: red; font-weight: bold; font-size: 14px;");
} else {
  try {
    supabase = createClient(YOUR_SUPABASE_URL, YOUR_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, 
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    if (supabase) {
      console.log("%cSupabase client initialized successfully using direct configuration in supabaseService.ts.", "color: green; font-weight: bold;");
    } else {
      supabaseInitializationError = new Error("createClient returned null without throwing an error. Supabase is not available.");
      console.error(`%c${supabaseInitializationError.message}`, "color: red; font-weight: bold; font-size: 14px;");
    }
  } catch (err: any) {
    supabaseInitializationError = err;
    console.error("%cSUPABASE CLIENT INITIALIZATION FAILED (direct config):", "color: red; font-weight: bold; font-size: 14px;", err);
  }
}

export const getSupabaseClientStatus = (): SupabaseServiceStatus => {
  let detailedMsg = "";
  if (supabaseInitializationError) {
    detailedMsg = `Error al inicializar Supabase: ${supabaseInitializationError.message}`;
    if (YOUR_SUPABASE_URL === "COPIA_AQUÍ_TU_SUPABASE_URL" || YOUR_SUPABASE_ANON_KEY === "COPIA_AQUÍ_TU_SUPABASE_ANON_KEY") {
        detailedMsg += " Por favor, asegúrate de haber editado 'services/supabaseService.ts' con tus credenciales reales de Supabase.";
    }
  } else if (!supabase) {
    detailedMsg = "Cliente Supabase no disponible por razón desconocida.";
  }

  return {
    clientInitialized: !!supabase,
    error: supabaseInitializationError,
    detailedMessage: supabaseInitializationError ? detailedMsg : (supabase ? "Supabase inicializado correctamente." : "Supabase no disponible."),
  };
};

const SUPABASE_USER_PROFILE_ROW_ID_KEY = 'nutrikick_supabase_profile_row_id';

const getOrCreateSupabaseProfileRowId = (): string => {
  if (typeof localStorage === 'undefined') {
    console.warn("localStorage is not available. Cannot manage Supabase profile row ID. Returning a temporary UUID.");
    return crypto.randomUUID(); 
  }
  let rowId = localStorage.getItem(SUPABASE_USER_PROFILE_ROW_ID_KEY);
  if (!rowId) {
    rowId = crypto.randomUUID();
    localStorage.setItem(SUPABASE_USER_PROFILE_ROW_ID_KEY, rowId);
    console.log("Generated new Supabase profile row ID:", rowId);
  }
  return rowId;
};

const mapProfileToSupabaseSchema = (profile: UserProfile, id: string): any => {
  return {
    id: id, 
    name: profile.name || null,
    email: profile.email || null,
    phone: profile.phone || null,
    age: profile.age || null, 
    weight: profile.weight || null,
    height: profile.height || null, 
    gender: profile.gender || null,
    is_athlete: profile.isAthlete || false,
    position: profile.isAthlete ? (profile.position || null) : null,
    training_load: profile.isAthlete ? (profile.trainingLoad || null) : null,
    training_frequency: !profile.isAthlete ? (profile.trainingFrequency || null) : null,
    goals: profile.goals || null,
    last_updated_at: new Date().toISOString(), 
  };
};

export const saveUserProfileToSupabase = async (userProfile: UserProfile): Promise<void> => {
  const status = getSupabaseClientStatus();
  if (!status.clientInitialized || !supabase) {
    const errorMessage = status.detailedMessage || "Cliente Supabase no está inicializado. No se pudo guardar el perfil.";
    console.error("Supabase client is not initialized. Skipping saveUserProfileToSupabase.", errorMessage);
    throw new Error(errorMessage);
  }

  const rowId = getOrCreateSupabaseProfileRowId();
  if (!rowId) { 
      const errorMessage = "No se pudo obtener un identificador (rowId) para guardar el perfil en Supabase.";
      console.error(errorMessage);
      throw new Error(errorMessage);
  }

  const profileDataForSupabase = mapProfileToSupabaseSchema(userProfile, rowId);

  try {
    // The 'error' object from Supabase contains details about the RLS failure.
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([profileDataForSupabase], { onConflict: 'id' })
      .select(); // Adding .select() can sometimes provide more context or ensure the operation completes.

    if (error) {
      console.error(`Error saving user profile to Supabase (rowId: ${rowId}). Supabase error object:`, JSON.stringify(error, null, 2));
      throw error; 
    }
    console.log(`User profile for row ID ${rowId} saved/updated in Supabase. Result:`, data);

  } catch (error: any) {
    console.error(`Exception during Supabase save operation (rowId: ${rowId}). Full exception object:`, JSON.stringify(error, null, 2));
    let UImessage = "Ocurrió un error al guardar tu perfil en la base de datos. Revisa la consola para más detalles.";
    if (error.message) {
        if (error.message.includes("violates row-level security policy") || (error.details && error.details.includes("violates row-level security policy"))) {
            UImessage = "Error de permisos: La operación fue bloqueada por las políticas de seguridad de la base de datos (RLS). Por favor, verifica tus políticas RLS en el panel de Supabase para la tabla 'user_profiles' y el rol 'anon'.";
        } else if (error.message.includes("network error") || error.message.includes("Failed to fetch")) {
            UImessage = "Error de red al intentar guardar el perfil. Revisa tu conexión a internet.";
        } else if (error.code && error.code.startsWith('PGRST')) { 
            UImessage = `Error de base de datos (${error.code}): ${error.message}. Verifica las políticas RLS y la estructura de la tabla.`;
        } else {
             UImessage = `Error al guardar en base de datos: ${error.message}`;
        }
    }
    throw new Error(UImessage);
  }
};
