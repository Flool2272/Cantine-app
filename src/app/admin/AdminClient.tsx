"use client";

import { useEffect, useState } from "react";

type Employee = { id: number; lastName: string; firstName: string; active: boolean; matricule: string | null };
type NewCode = { lastName: string; firstName: string; matricule: string | null; code: string };

function MatriculeCell({
  employeeId,
  value,
  onSaved,
}: {
  employeeId: number;
  value: string | null;
  onSaved: (v: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === (value ?? "")) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricule: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      onSaved(trimmed || null);
    } else {
      setError(data.error ?? "Erreur.");
      setDraft(value ?? "");
    }
  }

  return (
    <div>
      <input
        className="input"
        style={{ padding: "6px 8px", fontSize: 13, width: 110 }}
        value={draft}
        placeholder="—"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        disabled={saving}
      />
      {error && (
        <div className="error-text" style={{ marginTop: 4, maxWidth: 160 }}>
          {error}
        </div>
      )}
    </div>
  );
}

type ProviderAccount = { id: number; name: string };

export default function AdminClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState("");
  const [importing, setImporting] = useState(false);
  const [newCodes, setNewCodes] = useState<NewCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState<{ id: number; code: string } | null>(null);
  const [accountCode, setAccountCode] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [providerAccounts, setProviderAccounts] = useState<ProviderAccount[]>([]);
  const [providerResetCode, setProviderResetCode] = useState<{ id: number; code: string } | null>(null);
  const [providerResetting, setProviderResetting] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/employees");
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees);
    }
    setLoading(false);
  }

  async function loadProviderAccounts() {
    const res = await fetch("/api/admin/provider-accounts");
    if (res.ok) {
      const data = await res.json();
      setProviderAccounts(data.accounts);
    }
  }

  useEffect(() => {
    load();
    loadProviderAccounts();
  }, []);

  async function resetProviderCode(account: ProviderAccount) {
    setProviderResetting(account.id);
    setProviderResetCode(null);
    const res = await fetch(`/api/admin/provider-accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetCode: true }),
    });
    const data = await res.json().catch(() => ({}));
    setProviderResetting(null);
    if (res.ok) {
      setProviderResetCode({ id: account.id, code: data.code });
    }
  }

  async function importLines(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.trim()) return;
    setImporting(true);
    setError(null);
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setError(data.error ?? "Échec de l'import.");
      return;
    }
    setNewCodes(data.created);
    setLines("");
    load();
  }

  async function toggleActive(emp: Employee) {
    await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !emp.active }),
    });
    load();
  }

  async function reset(emp: Employee) {
    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetCode: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetCode({ id: emp.id, code: data.code });
    }
  }

  async function remove(emp: Employee) {
    if (!confirm(`Supprimer ${emp.firstName} ${emp.lastName} et tout son historique d'inscriptions ?`)) return;
    await fetch(`/api/admin/employees/${emp.id}`, { method: "DELETE" });
    load();
  }

  async function changeAccountCode(e: React.FormEvent) {
    e.preventDefault();
    setAccountMessage(null);
    if (!/^\d{4,8}$/.test(accountCode.trim())) {
      setAccountMessage("Le code doit contenir entre 4 et 8 chiffres.");
      return;
    }
    setAccountSaving(true);
    const res = await fetch("/api/account/code", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: accountCode.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setAccountSaving(false);
    if (res.ok) {
      setAccountMessage("Votre code a été mis à jour.");
      setAccountCode("");
    } else {
      setAccountMessage(data.error ?? "Échec de la mise à jour.");
    }
  }

  function downloadCsv() {
    const header = "Nom;Prenom;Matricule;Code\n";
    const body = newCodes.map((c) => `${c.lastName};${c.firstName};${c.matricule ?? ""};${c.code}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codes-cantine.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="card">
        <h2>Mon code personnel</h2>
        <p className="subtitle">Changez votre propre code de connexion admin.</p>
        <form onSubmit={changeAccountCode}>
          <div className="toolbar">
            <div className="field">
              <label>Nouveau code (4 à 8 chiffres)</label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="••••"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={accountSaving}>
              {accountSaving ? "Enregistrement..." : "Mettre à jour"}
            </button>
          </div>
        </form>
        {accountMessage && <div className="helper">{accountMessage}</div>}
      </div>

      <div className="card">
        <h2>Compte(s) prestataire</h2>
        <p className="subtitle">Réinitialisez le code de connexion du prestataire si besoin.</p>
        {providerAccounts.length === 0 ? (
          <p className="muted">Aucun compte prestataire trouvé.</p>
        ) : (
          providerAccounts.map((account) => (
            <div key={account.id} className="toolbar" style={{ marginBottom: 0 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nom</label>
                <div>{account.name}</div>
              </div>
              <button
                className="btn"
                onClick={() => resetProviderCode(account)}
                disabled={providerResetting === account.id}
              >
                {providerResetting === account.id ? "Réinitialisation..." : "Réinitialiser code"}
              </button>
              {providerResetCode?.id === account.id && (
                <div className="helper">
                  Nouveau code : <strong>{providerResetCode.code}</strong>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Importer des employés</h2>
        <p className="subtitle">
          Une ligne par personne, au format <code>Nom;Prénom</code> ou <code>Nom;Prénom;Matricule</code> (matricule
          du badge cantine, facultatif — aussi accepté : tabulation ou virgule). Un code personnel à 4 chiffres est
          généré automatiquement pour chacun.
        </p>
        <form onSubmit={importLines}>
          <div className="field">
            <textarea
              className="input"
              placeholder={"Dupont;Marie;40881\nMartin;Jean;40882\n..."}
              value={lines}
              onChange={(e) => setLines(e.target.value)}
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={importing}>
            {importing ? "Import..." : "Importer"}
          </button>
        </form>

        {newCodes.length > 0 && (
          <div className="code-list">
            <strong>{newCodes.length} compte(s) créé(s)</strong> — notez ces codes, ils ne seront plus jamais
            affichés en clair.
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Matricule</th>
                  <th>Code</th>
                </tr>
              </thead>
              <tbody>
                {newCodes.map((c, i) => (
                  <tr key={i}>
                    <td>{c.lastName}</td>
                    <td>{c.firstName}</td>
                    <td>{c.matricule ?? <span className="muted">—</span>}</td>
                    <td>
                      <strong>{c.code}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn" style={{ marginTop: 12 }} onClick={downloadCsv}>
              Télécharger en CSV
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Employés ({employees.length})</h2>
        {loading ? (
          <p className="muted">Chargement...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Matricule</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.lastName}</td>
                  <td>{emp.firstName}</td>
                  <td>
                    <MatriculeCell
                      employeeId={emp.id}
                      value={emp.matricule}
                      onSaved={(v) =>
                        setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, matricule: v } : e)))
                      }
                    />
                  </td>
                  <td>
                    <span className={`badge ${emp.active ? "badge-good" : "badge-bad"}`}>
                      {emp.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => toggleActive(emp)}>
                        {emp.active ? "Désactiver" : "Activer"}
                      </button>
                      <button className="btn" onClick={() => reset(emp)}>
                        Réinitialiser code
                      </button>
                      <button className="btn btn-danger" onClick={() => remove(emp)}>
                        Supprimer
                      </button>
                    </div>
                    {resetCode?.id === emp.id && (
                      <div className="helper">
                        Nouveau code : <strong>{resetCode.code}</strong>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
