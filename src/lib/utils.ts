import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const METHOD_COLORS = {
  GET: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  POST: "text-green-400 border-green-400/30 bg-green-400/10",
  PUT: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  DELETE: "text-red-400 border-red-400/30 bg-red-400/10",
  PATCH: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

export const METHOD_BADGE_COLORS = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-orange-500",
  DELETE: "bg-red-500",
  PATCH: "bg-yellow-500",
};