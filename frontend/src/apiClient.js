import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:5000/api`;

export const apiClient = axios.create({
  baseURL: API_BASE
});

export function withAuth(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}
