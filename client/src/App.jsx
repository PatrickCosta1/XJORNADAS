import { useEffect, useMemo, useRef, useState } from "react";
import {
  apiUrl,
  companyLogin,
  createStudentProfile,
  getCompanyDashboard,
  getStudentDashboard,
  getStudentPublic,
  registerScan
} from "./api";

const TOTAL_STEPS = 4;
const STUDENT_SESSION_KEY = "jornadas26_student_session";
const COMPANY_SESSION_KEY = "jornadas26_company_session";

export default function App() {
  const [routeMode, setRouteMode] = useState("landing");
  const [routeSlug, setRouteSlug] = useState("");
  const [routeToken, setRouteToken] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [publicProfile, setPublicProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreatedPopup, setShowCreatedPopup] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [showQrPopup, setShowQrPopup] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [companyToken, setCompanyToken] = useState("");
  const [companyData, setCompanyData] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("A iniciar câmara...");

  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scanLockRef = useRef(false);

  const [name, setName] = useState("");
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvFile, setCvFile] = useState(null);

  const progress = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  function getDomainFromEmail(email) {
    const value = String(email || "").trim().toLowerCase();
    const atIndex = value.lastIndexOf("@");
    if (atIndex <= 0) return "";
    return value.slice(atIndex + 1);
  }

  function getCompanyWebsite(company) {
    const explicitWebsite = String(company?.websiteUrl || "").trim();
    if (explicitWebsite) return explicitWebsite;
    const domain = getDomainFromEmail(company?.email || "");
    return domain ? `https://${domain}` : "";
  }

  function getCompanyLogo(company) {
    const explicitLogo = String(company?.logoUrl || "").trim();
    if (explicitLogo) return explicitLogo;
    const domain = getDomainFromEmail(company?.email || "");
    if (domain) {
      return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(company?.name || "Empresa")}&background=d34600&color=fff`;
  }

  function readStoredSession() {
    try {
      const raw = localStorage.getItem(STUDENT_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.slug || !parsed?.token) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function readStoredCompanySession() {
    try {
      const raw = localStorage.getItem(COMPANY_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.token) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function persistSession(payload) {
    try {
      localStorage.setItem(
        STUDENT_SESSION_KEY,
        JSON.stringify({
          slug: payload.slug,
          token: payload.accessToken,
          name: payload.name || ""
        })
      );
    } catch {
      // sem bloqueio
    }
  }

  function persistCompanySession(payload) {
    try {
      localStorage.setItem(
        COMPANY_SESSION_KEY,
        JSON.stringify({
          token: payload.token,
          company: payload.company
        })
      );
    } catch {
      // sem bloqueio
    }
  }

  function clearCompanySession() {
    try {
      localStorage.removeItem(COMPANY_SESSION_KEY);
    } catch {
      // sem bloqueio
    }
  }

  function navigateToDashboard(slug, token, replace = false) {
    const path = `/student/${encodeURIComponent(slug)}/dashboard?token=${encodeURIComponent(token)}`;
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    setRouteMode("dashboard");
    setRouteSlug(slug);
    setRouteToken(token);
    setStarted(false);
    setShowQrPopup(false);
  }

  useEffect(() => {
    const resolveRoute = () => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";

      if (path === "/empresas") {
        setRouteMode("company");
        const storedCompany = readStoredCompanySession();
        setCompanyToken(storedCompany?.token || "");
        setCompanyData(storedCompany?.company ? { company: storedCompany.company, scans: [] } : null);
        return;
      }

      const profileMatch = path.match(/^\/p\/([^/]+)$/);
      if (profileMatch) {
        setRouteMode("public");
        setRouteSlug(decodeURIComponent(profileMatch[1]));
        return;
      }

      const dashboardMatch = path.match(/^\/student\/([^/]+)\/dashboard$/);
      if (dashboardMatch) {
        const slug = decodeURIComponent(dashboardMatch[1]);
        const tokenFromUrl = new URLSearchParams(window.location.search).get("token") || "";
        const stored = readStoredSession();
        const finalToken = tokenFromUrl || (stored?.slug === slug ? stored.token : "");

        setRouteMode("dashboard");
        setRouteSlug(slug);
        setRouteToken(finalToken);
        if (!tokenFromUrl && finalToken) {
          navigateToDashboard(slug, finalToken, true);
        }
        return;
      }

      const stored = readStoredSession();
      if (stored?.slug && stored?.token) {
        navigateToDashboard(stored.slug, stored.token, true);
        return;
      }

      setRouteMode("landing");
      setRouteSlug("");
      setRouteToken("");
      setCompanyToken("");
    };

    resolveRoute();
    window.addEventListener("popstate", resolveRoute);
    return () => window.removeEventListener("popstate", resolveRoute);
  }, []);

  useEffect(() => {
    if (routeMode !== "public" || !routeSlug) return;

    let active = true;
    setRouteLoading(true);
    setRouteError("");
    setPublicProfile(null);

    getStudentPublic(routeSlug)
      .then((data) => {
        if (!active) return;
        setPublicProfile(data);
      })
      .catch((err) => {
        if (!active) return;
        setRouteError(err.message || "Não foi possível carregar o perfil.");
      })
      .finally(() => {
        if (!active) return;
        setRouteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routeMode, routeSlug]);

  useEffect(() => {
    if (routeMode !== "dashboard" || !routeSlug) return;

    let active = true;
    setRouteLoading(true);
    setRouteError("");
    setDashboardData(null);

    getStudentDashboard(routeSlug, routeToken)
      .then((data) => {
        if (!active) return;
        setDashboardData(data);
      })
      .catch((err) => {
        if (!active) return;
        setRouteError(err.message || "Não foi possível carregar a área privada.");
      })
      .finally(() => {
        if (!active) return;
        setRouteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routeMode, routeSlug, routeToken]);

  async function refreshStudentDashboard() {
    if (routeMode !== "dashboard" || !routeSlug || !routeToken) return;
    setRouteLoading(true);
    try {
      const data = await getStudentDashboard(routeSlug, routeToken);
      setDashboardData(data);
    } catch {
      // sem bloqueio
    } finally {
      setRouteLoading(false);
    }
  }

  async function refreshCompanyDashboard(token) {
    const data = await getCompanyDashboard(token);
    setCompanyData(data);
    return data;
  }

  useEffect(() => {
    if (routeMode !== "company" || !companyToken) return;

    let active = true;
    setCompanyLoading(true);
    setCompanyError("");

    refreshCompanyDashboard(companyToken)
      .then((data) => {
        if (!active) return;
        persistCompanySession({ token: companyToken, company: data.company });
      })
      .catch((err) => {
        if (!active) return;
        setCompanyError(err.message || "Não foi possível carregar a homepage da empresa.");
      })
      .finally(() => {
        if (!active) return;
        setCompanyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routeMode, companyToken]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let cancelled = false;

    async function startScanner() {
      try {
        scanLockRef.current = false;
        if (!navigator.mediaDevices?.getUserMedia) {
          setScannerStatus("Câmara não suportada neste dispositivo.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!("BarcodeDetector" in window)) {
          setScannerStatus("Leitor QR não suportado neste browser. Usa Chrome no telemóvel.");
          return;
        }

        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        setScannerStatus("Aponta a câmara para o QR code...");

        const interval = window.setInterval(async () => {
          if (scanLockRef.current || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (!results?.length) return;

            const rawValue = results[0]?.rawValue || "";
            if (!rawValue) return;

            scanLockRef.current = true;
            await handleCompanyQrRead(rawValue);
            scanLockRef.current = false;
          } catch {
            // sem bloqueio
          }
        }, 450);

        return () => clearInterval(interval);
      } catch {
        setScannerStatus("Não foi possível abrir a câmara.");
      }
      return undefined;
    }

    let cleanInterval;
    startScanner().then((cleanup) => {
      cleanInterval = cleanup;
    });

    return () => {
      cancelled = true;
      if (cleanInterval) cleanInterval();
      if (scannerStreamRef.current) {
        scannerStreamRef.current.getTracks().forEach((track) => track.stop());
        scannerStreamRef.current = null;
      }
    };
  }, [scannerOpen]);

  function getStepError() {
    if (step === 1 && !name.trim()) return "Indique o seu nome completo.";

    if (step === 2) {
      if (!institutionalEmail.trim()) return "Indique o email institucional.";
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(institutionalEmail.trim())) return "Email inválido.";
    }

    if (step === 4 && cvFile && cvFile.type !== "application/pdf") {
      return "O CV deve estar em formato PDF.";
    }

    return "";
  }

  function nextStep() {
    const validation = getStepError();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  }

  function previousStep() {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function submitForm() {
    const validation = getStepError();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("institutionalEmail", institutionalEmail.trim());
      formData.append("linkedinUrl", linkedinUrl.trim());
      if (cvFile) {
        formData.append("cv", cvFile);
      }

      const result = await createStudentProfile(formData);
      persistSession({ ...result, name: name.trim() });
      setNewStudentName(name.trim());
      setShowCreatedPopup(true);
      window.setTimeout(() => {
        setShowCreatedPopup(false);
        navigateToDashboard(result.slug, result.accessToken);
      }, 900);
    } catch (err) {
      setError(err.message || "Não foi possível criar o perfil.");
    } finally {
      setLoading(false);
    }
  }

  function extractSlugFromQr(rawValue) {
    try {
      const url = new URL(rawValue);
      const path = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
      const profileMatch = path.match(/^\/p\/([^/]+)$/);
      if (profileMatch) return decodeURIComponent(profileMatch[1]);
      return "";
    } catch {
      const directMatch = String(rawValue).trim().match(/^\/p\/([^/]+)$/);
      return directMatch ? decodeURIComponent(directMatch[1]) : "";
    }
  }

  async function handleCompanyQrRead(rawValue) {
    if (!companyToken) return;

    const slug = extractSlugFromQr(rawValue);
    if (!slug) {
      setScannerStatus("QR inválido para este evento.");
      return;
    }

    try {
      setScannerStatus("A registar leitura...");
      await registerScan(slug, companyToken);
      await refreshCompanyDashboard(companyToken);
      setScannerStatus("Leitura registada com sucesso.");
      setScannerOpen(false);
    } catch (err) {
      setScannerStatus(err.message || "Erro ao registar leitura.");
    }
  }

  async function handleCompanyLogin(event) {
    event.preventDefault();
    if (!companyName.trim() || !companyPassword.trim()) {
      setCompanyError("Indica nome e password da empresa.");
      return;
    }

    setCompanyLoading(true);
    setCompanyError("");

    try {
      const result = await companyLogin({
        name: companyName.trim(),
        password: companyPassword.trim()
      });

      setCompanyToken(result.token);
      setCompanyData({ company: result.company, scans: [] });
      persistCompanySession(result);
    } catch (err) {
      setCompanyError(err.message || "Não foi possível iniciar sessão.");
    } finally {
      setCompanyLoading(false);
    }
  }

  function handleCompanyLogout() {
    clearCompanySession();
    setCompanyToken("");
    setCompanyData(null);
    setCompanyName("");
    setCompanyPassword("");
  }

  function closeStudentQrPopup() {
    setShowQrPopup(false);
    refreshStudentDashboard();
  }

  return (
    <div className="welcome-shell">
      {/* Elementos decorativos de fundo */}
      <div className="bg-gradient" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <header className="welcome-header">
        <img src="/logo-nes.png" alt="Logo NES" className="welcome-logo" />
      </header>

      <main className="welcome-content">
        <div className="glass-card">
          {routeMode === "public" ? (
            <section className="form-flow">
              <span className="event-badge">Perfil público</span>
              {routeLoading ? <p>A carregar perfil...</p> : null}
              {routeError ? <p className="error-text">{routeError}</p> : null}

              {publicProfile ? (
                <>
                  <h2 className="form-title">{publicProfile.name}</h2>
                  <p className="form-subtitle">{publicProfile.institutionalEmail}</p>

                  {publicProfile.linkedinUrl ? (
                    <a className="start-button" href={publicProfile.linkedinUrl} target="_blank" rel="noreferrer">
                      Ver LinkedIn
                    </a>
                  ) : null}

                  {publicProfile.hasCv ? (
                    <a
                      className="secondary-button"
                      href={`${apiUrl}/students/${publicProfile.slug}/cv`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver CV
                    </a>
                  ) : (
                    <p className="form-subtitle">Sem CV disponível.</p>
                  )}
                </>
              ) : null}
            </section>
          ) : routeMode === "dashboard" ? (
            <section className="form-flow">
              <span className="event-badge">Homepage</span>
              {routeLoading ? <p>A carregar dashboard...</p> : null}
              {routeError ? <p className="error-text">{routeError}</p> : null}

              {dashboardData ? (
                <>
                  <h2 className="form-title">Olá, {dashboardData.student?.name}</h2>
                  <p className="form-subtitle">O teu espaço das Jornadas.</p>

                  <div className="home-grid">
                    <article className="stat-card">
                      <small>Total de leituras</small>
                      <strong>{dashboardData.scans?.length || 0}</strong>
                    </article>
                    <article className="stat-card">
                      <small>Email</small>
                      <strong>{dashboardData.student?.institutionalEmail}</strong>
                    </article>
                    <article className="stat-card">
                      <small>LinkedIn</small>
                      <strong>{dashboardData.student?.linkedinUrl ? "Configurado" : "Não definido"}</strong>
                    </article>
                    <article className="stat-card">
                      <small>CV</small>
                      <strong>{dashboardData.student?.hasCv ? "Disponível" : "Não carregado"}</strong>
                    </article>
                  </div>

                  {(dashboardData.scans?.length || 0) > 0 ? (
                    <>
                      <p className="list-title">Últimas empresas que fizeram leitura</p>
                      <div className="company-feed-grid">
                        {dashboardData.scans.slice(0, 4).map((scan) => (
                          <article className="company-feed-card" key={scan.id}>
                            <div className="company-feed-head">
                              <img
                                src={getCompanyLogo(scan.company)}
                                alt={`Logo de ${scan.company?.name || "Empresa"}`}
                                className="company-logo"
                              />
                              <div>
                                <h4>{scan.company?.name || "Empresa"}</h4>
                                <small>{new Date(scan.scannedAt).toLocaleString("pt-PT")}</small>
                              </div>
                            </div>
                            {getCompanyWebsite(scan.company) ? (
                              <a
                                className="secondary-button compact-button"
                                href={getCompanyWebsite(scan.company)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Saber mais
                              </a>
                            ) : (
                              <button type="button" className="secondary-button compact-button" disabled>
                                Sem site
                              </button>
                            )}
                          </article>
                        ))}
                      </div>
                      {dashboardData.scans.length > 4 ? (
                        <p className="form-subtitle">+ {dashboardData.scans.length - 4} leituras adicionais</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="form-subtitle">Ainda não há leituras registadas.</p>
                  )}
                </>
              ) : null}
            </section>
          ) : routeMode === "company" ? (
            <section className="form-flow">
              <span className="event-badge">Empresas</span>

              {!companyToken ? (
                <form className="form-flow" onSubmit={handleCompanyLogin}>
                  <h2 className="form-title">Login empresa</h2>
                  <p className="form-subtitle">Acesso para empresas pré-configuradas.</p>

                  <label className="field">
                    Nome da empresa
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex.: Tech Corp"
                    />
                  </label>

                  <label className="field">
                    Password
                    <input
                      type="password"
                      value={companyPassword}
                      onChange={(e) => setCompanyPassword(e.target.value)}
                      placeholder="Password da empresa"
                    />
                  </label>

                  {companyError ? <p className="error-text">{companyError}</p> : null}

                  <button type="submit" className="start-button" disabled={companyLoading}>
                    {companyLoading ? "A entrar..." : "Entrar"}
                  </button>
                </form>
              ) : (
                <>
                  <h2 className="form-title">Homepage da empresa</h2>
                  <p className="form-subtitle">{companyData?.company?.name || "Empresa"}</p>

                  {companyError ? <p className="error-text">{companyError}</p> : null}
                  {companyLoading ? <p className="form-subtitle">A atualizar leituras...</p> : null}

                  <div className="home-grid">
                    <article className="stat-card">
                      <small>Total de QR lidos</small>
                      <strong>{companyData?.scans?.length || 0}</strong>
                    </article>
                    <article className="stat-card">
                      <small>Email</small>
                      <strong>{companyData?.company?.email || "-"}</strong>
                    </article>
                  </div>

                  {(companyData?.scans?.length || 0) > 0 ? (
                    <>
                      <p className="list-title">Alunos lidos</p>
                      <div className="scan-chips company-students-grid">
                        {companyData.scans.map((scan) => (
                          <article className="scan-chip company-student-card" key={scan.id}>
                            <h4>{scan.student?.name || "Aluno"}</h4>
                            <small>{scan.student?.institutionalEmail || "Sem email"}</small>
                            <div className="student-actions-row">
                              {scan.student?.linkedinUrl ? (
                                <a
                                  className="secondary-button compact-button"
                                  href={scan.student.linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  LinkedIn
                                </a>
                              ) : (
                                <button type="button" className="secondary-button compact-button" disabled>
                                  Sem LinkedIn
                                </button>
                              )}

                              {scan.student?.hasCv ? (
                                <a
                                  className="start-button compact-button"
                                  href={`${apiUrl}/students/${scan.student.slug}/cv`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Descarregar CV
                                </a>
                              ) : (
                                <button type="button" className="start-button compact-button" disabled>
                                  Sem CV
                                </button>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="form-subtitle">Ainda não foram lidos QR codes.</p>
                  )}

                  <button type="button" className="secondary-button" onClick={handleCompanyLogout}>
                    Terminar sessão
                  </button>
                </>
              )}
            </section>
          ) : !started ? (
            <>
              <span className="event-badge">Uma década de inovação</span>
              <h1>
                Bem-Vindo à <br />
                <span>X Jornadas de Sistemas</span>
              </h1>
              <p>Explora o futuro da tecnologia e inovação conosco.</p>
              <button type="button" className="start-button" onClick={() => setStarted(true)}>
                Começar
              </button>
            </>
          ) : (
            <section className="form-flow">
              <div className="progress-head">
                <span className="event-badge">Registo de aluno</span>
                <small>Passo {step} de {TOTAL_STEPS}</small>
              </div>

              <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <span style={{ width: `${progress}%` }} />
              </div>

              {step === 1 ? (
                <label className="field">
                  Nome completo *
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Ana Silva"
                  />
                </label>
              ) : null}

              {step === 2 ? (
                <label className="field">
                  Email institucional *
                  <input
                    autoFocus
                    type="email"
                    value={institutionalEmail}
                    onChange={(e) => setInstitutionalEmail(e.target.value)}
                    placeholder="upxxxxxxx@isep.ipp.pt"
                  />
                </label>
              ) : null}

              {step === 3 ? (
                <label className="field">
                  LinkedIn (opcional)
                  <input
                    autoFocus
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="linkedin.com/in/teu-perfil"
                  />
                </label>
              ) : null}

              {step === 4 ? (
                <label className="field">
                  CV em PDF (opcional, até 4MB)
                  <input
                    autoFocus
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  />
                </label>
              ) : null}

              {error ? <p className="error-text">{error}</p> : null}

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={previousStep} disabled={step === 1 || loading}>
                  Anterior
                </button>

                {step < TOTAL_STEPS ? (
                  <button type="button" className="start-button" onClick={nextStep} disabled={loading}>
                    Seguinte
                  </button>
                ) : (
                  <button type="button" className="start-button" onClick={submitForm} disabled={loading}>
                    {loading ? "A criar..." : "Criar perfil"}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {routeMode === "dashboard" && dashboardData?.qrCodeDataUrl ? (
        <button
          type="button"
          className="floating-qr-button"
          onClick={() => setShowQrPopup(true)}
          aria-label="Abrir QR code"
        >
          Ver QR
        </button>
      ) : null}

      {routeMode === "company" && companyToken ? (
        <button
          type="button"
          className="floating-qr-button"
          onClick={() => {
            setScannerStatus("A iniciar câmara...");
            setScannerOpen(true);
          }}
          aria-label="Ler QR code"
        >
          Ler QR
        </button>
      ) : null}

      {showCreatedPopup ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <span className="event-badge">Registo concluído</span>
            <h3>{newStudentName || "Perfil criado"}</h3>
            <p>Perfil criado com sucesso. A redirecionar para a tua área...</p>
          </div>
        </div>
      ) : null}

      {showQrPopup && dashboardData?.qrCodeDataUrl ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeStudentQrPopup}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span className="event-badge">QR code</span>
            <h3>{dashboardData.student?.name}</h3>
            <img src={dashboardData.qrCodeDataUrl} alt="QR code do aluno" className="qr-preview" />
            <button type="button" className="secondary-button" onClick={closeStudentQrPopup}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {scannerOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setScannerOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span className="event-badge">Leitor de QR</span>
            <h3>Apontar para o QR</h3>
            <video ref={videoRef} className="camera-preview" playsInline muted />
            <p>{scannerStatus}</p>
            <button type="button" className="secondary-button" onClick={() => setScannerOpen(false)}>
              Fechar câmara
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}