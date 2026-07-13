import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN" | "FACULTY" | "STUDENT";
  avatarUrl?: string;
  profileId?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  theme: "light" | "dark";
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  toggleTheme: () => void;
  api: typeof axios;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set default base URL for local development
const API_URL = "http://localhost:5000/api";
axios.defaults.baseURL = API_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });
  const [isLoading, setIsLoading] = useState(true);

  // Apply authorization header and interceptors
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Apply dark mode theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Handle auto login verify on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Verify profile to confirm token is active
          const res = await axios.get("/users/profile");
          const fetchedUser = {
            id: res.data.id,
            email: res.data.email,
            name: res.data.name,
            role: res.data.role,
            avatarUrl: res.data.avatarUrl,
            profileId: res.data.role === "STUDENT" ? res.data.studentProfile?.id : res.data.facultyProfile?.id
          };
          setUser(fetchedUser);
          localStorage.setItem("user", JSON.stringify(fetchedUser));
        } catch (err) {
          console.warn("Session expired. Logging out.");
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        theme,
        login,
        logout,
        toggleTheme,
        api: axios,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
