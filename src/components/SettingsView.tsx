import { useEffect, useState } from "react";
import { Check, Download, Eye, EyeOff, HardDrive, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { downloadWhisperModel, hasGeminiKey, saveGeminiKey, whisperStatus } from "../lib/api";
import type { WhisperProfile, WhisperStatus } from "../types";
import { PageHeading } from "./Brand";

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

  useEffect(() => {
    localStorage.setItem("whisper-profile", profile);
    void whisperStatus(profile).then(setStatus).catch(() => undefined);
    void hasGeminiKey().then(setKeySaved).catch(() => undefined);
  }, [profile]);

  const download = async () => {
    setDownloading(true);
    setMessage(undefined);
    try { await downloadWhisperModel(profile); setStatus(await whisperStatus(profile)); }
    catch (reason) { setMessage(String(reason)); }
    finally { setDownloading(false); }
  };

  const storeKey = async () => {
    if (!key.trim()) return;
    try { await saveGeminiKey(key.trim()); setKey(""); setKeySaved(true); setMessage("Clé enregistrée dans le coffre Windows."); }
    catch (reason) { setMessage(String(reason)); }
  };

  return (
    <div className="h-full overflow-y-auto">
      <header className="border-b border-[var(--line)] px-8 py-6"><PageHeading eyebrow="À ta façon" title="Paramètres" description="Transcription locale, confidentialité et analyse optionnelle." icon={SlidersHorizontal} /></header>
      <div className="mx-auto max-w-3xl space-y-8 px-8 py-8">
        {message && <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">{message}</div>}
        <section>
          <div className="mb-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl border-2 border-[var(--ink)] bg-[var(--aqua)]"><HardDrive size={18} /></div><div><h2 className="text-sm font-extrabold uppercase tracking-wide">Whisper local</h2><p className="text-xs text-[var(--muted)]">L'audio ne quitte jamais cet ordinateur.</p></div></div>
          <div className="panel overflow-hidden">{profiles.map((item, index) => <label key={item.id} className={`course-row flex cursor-pointer items-center gap-4 px-5 py-4 ${index ? "border-t" : ""}`}><input type="radio" name="profile" className="size-4 accent-[var(--blue)]" checked={profile === item.id} onChange={() => setProfile(item.id)} /><div className="flex-1"><p className="text-sm font-bold">{item.label}</p><p className="mt-0.5 text-xs text-[var(--muted)]">Modèle {item.model} · {item.detail}</p></div>{profile === item.id && status?.modelAvailable ? <span className="flex items-center gap-1.5 rounded-full bg-[var(--aqua)] px-3 py-1 text-xs font-bold"><Check size={14} /> Installé</span> : profile === item.id ? <button className="secondary-button" onClick={(event) => { event.preventDefault(); void download(); }} disabled={downloading}><Download size={14} />{downloading ? "Téléchargement…" : "Télécharger"}</button> : null}</label>)}</div>
          {status && !status.binaryAvailable && <p className="mt-3 text-xs leading-5 text-amber-700">{status.message}</p>}
        </section>
        <section>
          <div className="mb-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl border-2 border-[var(--ink)] bg-[var(--yellow)]"><ShieldCheck size={18} /></div><div><h2 className="text-sm font-extrabold uppercase tracking-wide">Analyse Gemini</h2><p className="text-xs text-[var(--muted)]">Seul le texte du cours sélectionné est envoyé.</p></div></div>
          <div className="panel p-5"><label className="label">Clé API personnelle</label><div className="flex gap-2"><div className="relative flex-1"><input className="field pr-10" type={showKey ? "text" : "password"} value={key} onChange={(event) => setKey(event.target.value)} placeholder={keySaved ? "Clé déjà enregistrée" : "AIza…"} /><button type="button" aria-label={showKey ? "Masquer la clé" : "Afficher la clé"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" onClick={() => setShowKey((current) => !current)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><button className="primary-button" onClick={() => void storeKey()}>Enregistrer</button></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Stockée via le gestionnaire d'identifiants Windows. Jamais dans SQLite, les logs ou Git.</p></div>
        </section>
        <section className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--lilac)] p-5"><p className="eyebrow !mb-1">Optionnel</p><h2 className="text-sm font-extrabold uppercase tracking-wide">Codex</h2><p className="mt-2 text-sm leading-6 text-[#49405a]">Le provider est prêt dans l'architecture. L'intégration utilisera uniquement les mécanismes officiels et une permission en lecture seule.</p></section>
      </div>
    </div>
  );
}
