import { useEffect, useState } from "react";
import { Check, Download, Eye, EyeOff, HardDrive, ShieldCheck } from "lucide-react";
import { downloadWhisperModel, hasGeminiKey, saveGeminiKey, whisperStatus } from "../lib/api";
import type { WhisperProfile, WhisperStatus } from "../types";

const profiles: Array<{ id: WhisperProfile; label: string; model: string; detail: string }> = [
  { id: "fast", label: "Rapide", model: "tiny", detail: "Pendant le cours · env. 75 Mo" },
  { id: "balanced", label: "Équilibré", model: "base", detail: "Bon compromis · env. 142 Mo" },
  { id: "accurate", label: "Précis", model: "small", detail: "Passe finale · env. 466 Mo" },
];

export function SettingsView() {
  const [profile, setProfile] = useState<WhisperProfile>(() => {
    const saved = localStorage.getItem("whisper-profile");
    return saved === "balanced" || saved === "accurate" ? saved : "fast";
  });
  const [status, setStatus] = useState<WhisperStatus>();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => { localStorage.setItem("whisper-profile", profile); void whisperStatus(profile).then(setStatus).catch(() => undefined); void hasGeminiKey().then(setKeySaved).catch(() => undefined); }, [profile]);
  const download = async () => { setDownloading(true); setMessage(undefined); try { await downloadWhisperModel(profile); setStatus(await whisperStatus(profile)); } catch (reason) { setMessage(String(reason)); } finally { setDownloading(false); } };
  const storeKey = async () => { if (!key.trim()) return; try { await saveGeminiKey(key.trim()); setKey(""); setKeySaved(true); setMessage("Clé enregistrée dans le coffre Windows."); } catch (reason) { setMessage(String(reason)); } };

  return <div className="h-full overflow-y-auto"><header className="border-b border-stone-200 px-8 py-6"><h1 className="text-xl font-semibold">Paramètres</h1><p className="mt-1 text-sm text-stone-500">Transcription locale, confidentialité et analyse optionnelle.</p></header><div className="mx-auto max-w-3xl space-y-8 px-8 py-8">{message && <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">{message}</div>}<section><div className="mb-4 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-stone-200/60"><HardDrive size={18} /></div><div><h2 className="text-sm font-semibold">Whisper local</h2><p className="text-xs text-stone-500">L'audio ne quitte jamais cet ordinateur.</p></div></div><div className="overflow-hidden rounded-xl border border-stone-200 bg-white">{profiles.map((item, index) => <label key={item.id} className={`flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-stone-50 ${index ? "border-t border-stone-100" : ""}`}><input type="radio" name="profile" className="accent-stone-900" checked={profile === item.id} onChange={() => setProfile(item.id)} /><div className="flex-1"><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-stone-500">Modèle {item.model} · {item.detail}</p></div>{profile === item.id && status?.modelAvailable ? <span className="flex items-center gap-1.5 text-xs text-emerald-700"><Check size={14} /> Installé</span> : profile === item.id ? <button className="secondary-button" onClick={(event) => { event.preventDefault(); void download(); }} disabled={downloading}><Download size={14} />{downloading ? "Téléchargement…" : "Télécharger"}</button> : null}</label>)}</div>{status && !status.binaryAvailable && <p className="mt-3 text-xs leading-5 text-amber-700">{status.message}</p>}</section><section><div className="mb-4 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-stone-200/60"><ShieldCheck size={18} /></div><div><h2 className="text-sm font-semibold">Analyse Gemini</h2><p className="text-xs text-stone-500">Seul le texte du cours sélectionné est envoyé.</p></div></div><div className="rounded-xl border border-stone-200 bg-white p-5"><label className="label">Clé API personnelle</label><div className="flex gap-2"><div className="relative flex-1"><input className="field pr-10" type={showKey ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder={keySaved ? "Clé déjà enregistrée" : "AIza…"} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><button className="primary-button" onClick={() => void storeKey()}>Enregistrer</button></div><p className="mt-3 text-xs leading-5 text-stone-400">Stockée via le gestionnaire d'identifiants Windows. Jamais dans SQLite, les logs ou Git.</p></div></section><section className="rounded-xl border border-stone-200 bg-[#f7f6f2] p-5"><h2 className="text-sm font-semibold">Codex</h2><p className="mt-2 text-sm leading-6 text-stone-500">Le provider est prévu dans l'architecture. L'intégration utilisera uniquement le SDK/App Server officiel et une permission en lecture seule, après une authentification gérée par Codex.</p></section></div></div>;
}
