import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useMemo } from "react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export function useApi() {
  const { getToken } = useAuth();

  return useMemo(() => {
    const client = axios.create({ baseURL: BASE_URL });

    client.interceptors.request.use(async (config) => {
      const token = await getToken({ template: "problem-solving-template" });
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    return client;
  }, [getToken]);
}
