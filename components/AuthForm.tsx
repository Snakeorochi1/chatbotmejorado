
import React, { useState, useEffect } from 'react';

interface AuthFormProps {
  onAuthSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  supabaseSignUp: (email: string, pass: string) => Promise<{ user: any, error: Error | null }>;
  supabaseSignIn: (email: string, pass: string) => Promise<{ session: any, error: Error | null }>;
  authError: string | null; // New prop
}

const REMEMBERED_EMAIL_KEY = 'nutrikick_remembered_email';

export const AuthForm: React.FC<AuthFormProps> = ({ 
  onAuthSuccess, 
  isLoading, 
  setIsLoading, 
  setAuthError,
  supabaseSignUp,
  supabaseSignIn,
  authError
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState<boolean>(false);

  const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors placeholder-slate-400";
  const primaryButtonClasses = "w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-orange-600 transition-transform transform hover:scale-105 active:scale-95 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed";

  useEffect(() => {
    const storedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setAuthError("Las contraseñas no coinciden.");
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    if (rememberEmail && email.trim()) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
    } else if (!rememberEmail) {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    try {
      if (isLogin) {
        const { error, session } = await supabaseSignIn(email, password);
        if (error) throw error;
        if (session) {
            // onAuthSuccess will be called by onAuthStateChange in App.tsx
        } else {
             throw new Error("No se pudo iniciar sesión. Verifica tus credenciales.");
        }
      } else {
        const { error, user } = await supabaseSignUp(email, password);
        if (error) throw error;
        if (user) {
            alert("¡Cuenta creada! Revisa tu correo electrónico para confirmar tu cuenta si es necesario, luego intenta iniciar sesión.");
            setIsLogin(true); 
            // Don't clear email if rememberEmail is true
            if(!rememberEmail) setEmail(''); 
            setPassword(''); 
            setConfirmPassword(''); 
            // onAuthSuccess will be called by onAuthStateChange in App.tsx
        } else {
            throw new Error("No se pudo crear la cuenta. Intenta de nuevo.");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(err.message || "Error de autenticación desconocido.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-700 text-slate-200 rounded-lg shadow-xl animate-fadeIn max-w-md mx-auto my-auto"> {/* Changed my-8 to my-auto for modal centering */}
      <h2 className="text-2xl font-semibold text-slate-100 mb-6 text-center">
        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
      </h2>
      {authError && ( <div className="bg-red-700/80 border border-red-500 text-red-200 p-3 text-sm mb-4 rounded-md shadow animate-fadeIn text-center" role="alert"> <p>{authError}</p> </div> )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-slate-300 mb-1">
            Correo Electrónico
          </label>
          <input
            type="email"
            name="email"
            id="auth-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={commonInputClasses}
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-slate-300 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            name="password"
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={commonInputClasses}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        {!isLogin && (
          <div>
            <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-slate-300 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              name="confirmPassword"
              id="auth-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className={commonInputClasses}
              placeholder="Repite tu contraseña"
            />
          </div>
        )}
        <div className="flex items-center justify-between mt-4 mb-2"> {/* Adjusted margin */}
          <div className="flex items-center">
            <input
              id="remember-email"
              name="remember-email"
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-400 bg-slate-500 rounded"
            />
            <label htmlFor="remember-email" className="ml-2 block text-sm text-slate-300">
              Recordar correo
            </label>
          </div>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={isLoading} className={primaryButtonClasses}>
            {isLoading ? (isLogin ? 'Iniciando sesión...' : 'Creando cuenta...') : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </div>
      </form>
      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setAuthError(null);
            // Optionally clear fields, or keep them if user misclicked
            // setEmail(''); 
            // setPassword('');
            // setConfirmPassword('');
          }}
          className="text-sm text-orange-400 hover:text-orange-300 hover:underline focus:outline-none"
        >
          {isLogin ? '¿No tienes cuenta? Crea una aquí.' : '¿Ya tienes cuenta? Inicia sesión.'}
        </button>
      </div>
    </div>
  );
};
