
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScanLine,
  ArrowLeft,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  UserRound,
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  CalendarDays,
  Phone,
  Activity,
  Download,
  RotateCcw,
  Terminal,
  Sparkles,
  FileCheck2,
  Clock3,
  House,
} from "lucide-react";

import logo from "../assets/logo_icon.png";

const API_URL = "http://localhost:8000/extract_pres";
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function Detail({ label, value, icon: Icon }) {
  if (value == null || value === "") return null;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm sm:p-4">
      <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {Icon && <Icon size={13} />}
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-slate-800">
        {typeof value === "object" ? JSON.stringify(value) : String(value)}
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 sm:text-base">
          {title}
        </h3>
      </div>

      {count !== undefined && (
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-500">
          {count}
        </span>
      )}
    </div>
  );
}

export default function PrescriptionAnalyzer() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;

    const validType =
      ACCEPTED_TYPES.includes(selectedFile.type) ||
      /\.(pdf|jpe?g|png|webp)$/i.test(selectedFile.name);

    if (!validType) {
      setError("Please upload a PDF, JPG, PNG, or WebP file.");
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("File size must be 15 MB or less.");
      return;
    }

    setFile(selectedFile);
    setError("");
    setResult(null);
    setElapsed(null);
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Select a prescription file before starting extraction.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const started = Date.now();
    const formData = new FormData();

    // The backend should declare its upload field as "file".
    formData.append("file", file);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const raw = await response.text();
      let payload;

      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error(
          response.ok
            ? "The server returned an unexpected response."
            : `Server error (${response.status}). Check your backend logs.`
        );
      }

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            payload.message ||
            `Extraction failed (${response.status}).`
        );
      }

      // Supports { file_name, data: {...} } and direct {...} responses.
      const extracted = payload.data ?? payload.result ?? payload;

      if (
        !extracted ||
        typeof extracted !== "object" ||
        Array.isArray(extracted)
      ) {
        throw new Error("The API response did not contain valid prescription data.");
      }

      setResult({
        file_name: payload.file_name || file.name,
        data: extracted,
      });

      setElapsed(((Date.now() - started) / 1000).toFixed(1));
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the prescription API. Make sure your backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    setElapsed(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadJson = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prescription-analysis.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const data = result?.data;
  const medicines = Array.isArray(data?.medicines) ? data.medicines : [];
  const investigations = Array.isArray(data?.investigations)
    ? data.investigations
    : [];
  const vitals = data?.vitals || {};

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            

            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-transform duration-300 hover:rotate-[-6deg] hover:scale-105">
                <img src={logo} alt="Scanalyze Logo" className="h-full w-full object-contain" />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">
                VaidyaVani<span className="text-blue-600">.AI</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Intelligent Medical Document Extraction
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            aria-label="Go to home"
            title="Home"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
            <House size={18} />
            </button>
        </header>

        {/* Page introduction */}
        <section className="mb-2 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              <Sparkles size={14} />
              Upload a prescription and extract patient details, clinic
              information, medicines, and investigations.
            </div>

            {/* <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Prescription <span className="text-blue-600">workspace</span>
            </h2> */}

            {/* <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Upload a prescription and extract patient details, clinic
              information, medicines, and investigations.
            </p> */}
          </div>

          {/* <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-500 shadow-sm">
            <Terminal size={15} className="text-blue-600" />
            <span>prescription.extract()</span>
          </div> */}
        </section>

        {/* Main workspace */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.5fr)] xl:gap-6">
          {/* LEFT: Upload panel */}
          <aside className="animate-[fadeInUp_0.45s_ease-out_both] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Input / 01
                </p>
                <h3 className="mt-1 text-base font-bold">Upload Document</h3>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <UploadCloud size={20} />
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                selectFile(e.dataTransfer.files?.[0]);
              }}
              className={`group flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300 ${
                dragging
                  ? "scale-[1.01] border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Selected prescription preview"
                  className="mb-3 max-h-44 max-w-full rounded-lg object-contain shadow-sm"
                />
              ) : file ? (
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 transition group-hover:scale-105">
                  <FileText size={32} />
                </div>
              ) : (
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 transition duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                  <UploadCloud size={30} />
                </div>
              )}

              <p className="max-w-full break-all text-sm font-bold text-slate-800">
                {file ? file.name : "Drop your prescription here"}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change file`
                  : "or click to browse your device"}
              </p>

              {!file && (
                <span className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[10px] text-slate-500">
                  PDF / JPG / PNG / WEBP
                </span>
              )}
            </button>

            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  {file.type === "application/pdf" ? (
                    <FileText size={20} />
                  ) : (
                    <ImageIcon size={20} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {file.name}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetAll}
                  aria-label="Remove file"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleExtract}
              disabled={!file || loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/15 transition duration-300 hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Analyzing prescription...
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  Extract prescription
                </>
              )}
            </button>

            {/* <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
              <Activity size={15} className="mt-0.5 shrink-0 text-blue-600" />
              <p>
                Extraction reads the uploaded document. Always verify
                extracted medicine names and instructions with a qualified
                healthcare professional.
              </p>
            </div> */}

            <div className="mt-2 border-t border-slate-100 pt-4">
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Process pipeline
              </p>

              {[
                "Document upload",
                "AI field extraction",
                "Structured JSON output",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3 py-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[10px] font-bold ${
                      result && !loading
                        ? "bg-emerald-100 text-emerald-700"
                        : loading && index === 1
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {result && !loading ? (
                      <CheckCircle2 size={13} />
                    ) : loading && index === 1 ? (
                      <LoaderCircle size={13} className="animate-spin" />
                    ) : (
                      `0${index + 1}`
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{step}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* RIGHT: Results panel */}
          <section className="min-w-0 animate-[fadeInUp_0.6s_ease-out_both]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Output / 02
                </p>
                <h3 className="mt-1 text-base font-bold">Extraction results</h3>
              </div>

              <div className="flex items-center gap-2">
                {result && (
                  <>
                    <button
                      type="button"
                      onClick={downloadJson}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      <Download size={14} />
                      Export JSON
                    </button>

                    <button
                      type="button"
                      onClick={resetAll}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                  <div className="absolute inset-0 animate-ping rounded-3xl border border-blue-200 opacity-50" />
                  <ScanLine size={34} className="animate-pulse" />
                </div>

                <h3 className="text-lg font-bold">Analyzing document</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  The AI is reading the prescription and organizing the
                  extracted fields. This may take a little while.
                </p>

                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-blue-600">
                  <LoaderCircle size={15} className="animate-spin" />
                  PROCESSING_DOCUMENT...
                </div>

                <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/2 animate-[loadingBar_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                </div>
              </div>
            ) : !result ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
                  <FileCheck2 size={30} />
                </div>

                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Awaiting response
                </p>

                <h3 className="mt-3 text-lg font-bold text-slate-800">
                  Your results will appear here
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Upload a prescription on the left and select{" "}
                  <span className="font-semibold text-blue-600">
                    Extract prescription
                  </span>{" "}
                  to view the structured output.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {["Patient details", "Medicines", "Clinic details"].map(
                    (label) => (
                      <span
                        key={label}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium text-slate-500"
                      >
                        {label}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Success banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-[fadeInUp_0.35s_ease-out_both]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <CheckCircle2 size={21} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        Extraction completed
                      </p>
                      <p className="mt-1 max-w-[240px] truncate text-xs text-emerald-700">
                        {result.file_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <Clock3 size={14} />
                    {elapsed}s
                  </div>
                </div>

                {/* Summary statistics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 transition hover:-translate-y-0.5">
                    <Pill size={19} className="mb-3 text-blue-700" />
                    <p className="text-2xl font-extrabold text-blue-900">
                      {data.medicine_count ?? medicines.length}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">Medicines found</p>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 transition hover:-translate-y-0.5">
                    <UserRound size={19} className="mb-3 text-violet-700" />
                    <p className="truncate text-base font-extrabold text-violet-900">
                      {data.patient_name || "Not detected"}
                    </p>
                    <p className="mt-1 text-xs text-violet-700">Patient</p>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 transition hover:-translate-y-0.5 sm:col-span-1">
                    <FlaskConical size={19} className="mb-3 text-amber-700" />
                    <p className="text-2xl font-extrabold text-amber-900">
                      {investigations.length}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Investigations
                    </p>
                  </div>
                </div>

                {/* Patient */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                  <SectionTitle icon={UserRound} title="Patient information" />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Detail label="Patient name" value={data.patient_name} />
                    <Detail label="Age" value={data.patient_age} />
                    <Detail label="Gender" value={data.patient_gender} />
                    <Detail label="Weight" value={data.patient_weight} />
                    <Detail label="Contact" value={data.patient_contact} icon={Phone} />
                    <Detail label="Prescription date" value={data.prescription_date} icon={CalendarDays} />
                  </div>

                  {data.diagnosis && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Diagnosis / complaints
                      </p>
                      <p className="text-sm leading-6 text-slate-700">
                        {data.diagnosis}
                      </p>
                    </div>
                  )}

                  {Object.keys(vitals).length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Activity size={15} />
                        Recorded vitals
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {Object.entries(vitals).map(([key, value]) => (
                          <Detail
                            key={key}
                            label={key.replaceAll("_", " ")}
                            value={value}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Doctor and clinic */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <SectionTitle icon={Stethoscope} title="Doctor & clinic" />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Detail label="Doctor name" value={data.doctor_name} />
                    <Detail label="Qualification" value={data.doctor_qualification} />
                    <Detail label="Registration number" value={data.doctor_registration_number} />
                    <Detail label="Clinic name" value={data.clinic_name} icon={Building2} />
                    <Detail label="Clinic address" value={data.clinic_address} />
                    <Detail label="Clinic phone" value={data.clinic_phone} icon={Phone} />
                  </div>
                </div>

                {/* Medicines */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <SectionTitle
                    icon={Pill}
                    title="Prescribed medicines"
                    count={medicines.length}
                  />

                  {medicines.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No medicines were detected in this prescription.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {medicines.map((medicine, index) => (
                        <article
                          key={`${medicine.name || "medicine"}-${index}`}
                          style={{ animationDelay: `${index * 80}ms` }}
                          className="animate-[fadeInUp_0.4s_ease-out_both] overflow-hidden rounded-xl border border-slate-200 transition hover:border-blue-200 hover:shadow-sm"
                        >
                          <div className="flex items-start gap-3 bg-blue-50/70 p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                              <Pill size={18} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="break-words text-sm font-bold text-slate-800">
                                {medicine.name || "Unnamed medicine"}
                              </h4>

                              <p className="mt-1 text-xs text-slate-500">
                                {[medicine.form, medicine.strength]
                                  .filter(Boolean)
                                  .join(" · ") || "Form or strength not specified"}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-md border border-blue-100 bg-white px-2 py-1 font-mono text-[10px] text-blue-700">
                              RX-{String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3">
                            {[
                              ["Dosage", medicine.dosage],
                              ["Frequency", medicine.frequency],
                              ["Duration", medicine.duration],
                              ["Route", medicine.route],
                              ["Timing", medicine.timing],
                              ["Quantity", medicine.quantity],
                              ["Instructions", medicine.instructions],
                            ]
                              .filter(([, value]) => value != null && value !== "")
                              .map(([label, value]) => (
                                <div key={label} className="min-w-0 bg-white p-3">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    {label}
                                  </p>
                                  <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-700">
                                    {String(value)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {/* Investigations */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <SectionTitle
                    icon={FlaskConical}
                    title="Investigations"
                    count={investigations.length}
                  />

                  {investigations.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No investigations were listed in the API response.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {investigations.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-600" />
                          {typeof item === "object"
                            ? JSON.stringify(item)
                            : String(item)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Advice and follow-up */}
                {(data.advice || data.follow_up) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                    <SectionTitle
                      icon={FileText}
                      title="Advice & follow-up"
                    />

                    {data.advice && (
                      <div className="mb-3 rounded-xl bg-white/80 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Advice
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {data.advice}
                        </p>
                      </div>
                    )}

                    {data.follow_up && (
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Follow-up
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {data.follow_up}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="px-2 pb-2 text-center text-[11px] leading-5 text-slate-400">
                  AI-extracted information may contain errors. Confirm all
                  medical details with a qualified healthcare professional.
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-center font-mono text-[10px] text-slate-400">
          SCANALYZE / DOCUMENT AI / PRESCRIPTION ANALYZER
        </footer>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
