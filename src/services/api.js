// src/services/api.js

const FLOW_URL = import.meta.env.VITE_FLOW_URL;
const PREFILL_URL = import.meta.env.VITE_PREFILL_URL;
const LIST_BY_SCHOOL_URL = import.meta.env.VITE_LIST_BY_SCHOOL_URL;

// Utility to safely convert values to strings
export function asString(v) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

// Utility to convert file to Base64
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
  });

// POST to Power Automate Flow
export async function postToFlow(payload) {
  if (!FLOW_URL) throw new Error("Missing VITE_FLOW_URL");
  const resp = await fetch(FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${text || "No response"}`);
  }
  try {
    return await resp.json();
  } catch {
    return { ok: true };
  }
}

// Fetch Consultations Logic
export async function fetchConsultationsForSchool(dfeValue, codeValue, location) {
  const qs = new URLSearchParams(location.search);
  const token = qs.get("token");
  const idConsultParam =
    qs.get("idConsult") ||
    qs.get("consultId") ||
    qs.get("ConsultID") ||
    qs.get("idConsultation");

  // Mode 1: Token (prefill)
  if (token) {
    if (!PREFILL_URL) throw new Error("Missing VITE_PREFILL_URL");
    let url = `${PREFILL_URL}${PREFILL_URL.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    if (idConsultParam) {
      url += `&idConsult=${encodeURIComponent(idConsultParam)}`;
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Prefill API failed");
    const data = await resp.json();

    return [
      {
        id: asString(
          data.idConsult ?? data.idConsultation ?? idConsultParam ?? token,
        ),
        impulseId: asString(data.impulseId ?? ""),
        forename: asString(data.forename ?? ""),
        surname: asString(data.surname ?? ""),
        settingName: asString(data.settingName ?? ""),
        idConsult: asString(
          data.idConsult ?? data.idConsultation ?? idConsultParam ?? "",
        ),
        phaseId: asString(data.phaseId ?? ""),
        dueDate: asString(data.dueDate ?? ""),
      },
    ];
  }

  // Mode 2: Portal Login
  if (!dfeValue || !codeValue) {
    throw new Error("Please enter both DfE number and login code.");
  }
  if (!LIST_BY_SCHOOL_URL) throw new Error("Missing VITE_LIST_BY_SCHOOL_URL");

  const key = `${dfeValue}/${codeValue}`;
  const url = `${LIST_BY_SCHOOL_URL}${LIST_BY_SCHOOL_URL.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("List-by-school API failed");

  const list = await resp.json();
  if (!Array.isArray(list)) {
    const msg =
      list?.error || list?.message || "Unexpected response from login API.";
    throw new Error(msg);
  }
  
  return list.map((c, i) => ({
    id: `c${i + 1}`,
    impulseId: asString(c.impulseId ?? ""),
    forename: asString(c.forename ?? ""),
    surname: asString(c.surname ?? ""),
    settingName: asString(c.settingName ?? ""),
    idConsult: asString(c.idConsult ?? c.idConsultation ?? ""),
    phaseId: asString(c.phaseId ?? ""),
    dueDate: asString(c.dueDate ?? ""),
  }));
}