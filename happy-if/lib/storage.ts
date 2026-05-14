"use client";

const PARTICIPANT_KEY = (sessionId: string) => `happyif:participant:${sessionId}`;
const FACILITATOR_KEY = (sessionId: string) => `happyif:facilitator:${sessionId}`;

export function saveParticipantId(sessionId: string, participantId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PARTICIPANT_KEY(sessionId), participantId);
}

export function getParticipantId(sessionId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PARTICIPANT_KEY(sessionId));
}

export function clearParticipantId(sessionId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PARTICIPANT_KEY(sessionId));
}

export function saveFacilitatorToken(sessionId: string, token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(FACILITATOR_KEY(sessionId), token);
}

export function getFacilitatorToken(sessionId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(FACILITATOR_KEY(sessionId));
}
