import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await Auth.getSessionToken();
      if (!token) {
        setUser(null);
        return;
      }

      // On revalide toujours auprès du serveur (le code a pu être désactivé/régénéré).
      const apiUser = await Api.getMe();
      if (apiUser) {
        setUser(apiUser);
        await Auth.setUserInfo(apiUser);
      } else {
        setUser(null);
        await Auth.removeSessionToken();
        await Auth.clearUserInfo();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Échec de la récupération du profil");
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithCode = useCallback(async (code: string) => {
    const { token, user: loggedInUser } = await Api.loginWithCode(code);
    await Auth.setSessionToken(token);
    await Auth.setUserInfo(loggedInUser);
    setUser(loggedInUser);
    setError(null);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      // On continue la déconnexion même si l'appel serveur échoue.
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) {
      // On affiche d'abord le profil en cache pour un démarrage rapide, puis on revalide.
      Auth.getUserInfo().then((cachedUser) => {
        if (cachedUser) {
          setUser(cachedUser);
          setLoading(false);
        }
        fetchUser();
      });
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    loginWithCode,
    logout,
  };
}
