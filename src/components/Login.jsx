import { useState } from "react";
import { Clock, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [orgCode, setOrgCode] = useState("");

  const handleSendOtp = async () => {
    setErr("");
    if (!email.trim()) return setErr("Enter your work email.");
    if (!orgCode.trim()) return setErr("Enter your organization code.");
    setBusy(true);
    try {
      await sendOtp(email.trim(), name.trim(), orgCode.trim());
      setStep("code");
    } catch (e) {
      setErr(e.message || "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setErr("");
    if (!code.trim()) return setErr("Enter the 6-digit code from your email.");
    setBusy(true);
    try {
      await verifyOtp(email.trim(), code.trim());
      // AuthProvider's onAuthStateChange picks up the new session automatically
    } catch (e) {
      setErr(e.message || "That code didn't work. Check it and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101820] text-[#EDE7DA] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded bg-[#3D6B7D] flex items-center justify-center">
            <Clock size={18} />
          </div>
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] text-[#8FA6AE] uppercase">
              Timesheet Co.
            </div>
            <div className="font-semibold text-lg leading-none">
              Attendance Ledger
            </div>
          </div>
        </div>

        <div className="bg-[#16202B] border border-[#26333F] rounded-xl p-6">
          {step === "email" ? (
            <>
              <p className="text-[13px] text-[#8FA6AE] mb-4">
                Enter your work email — we'll send you a one-time sign-in code.
                New here? Add your name too.
              </p>
              <label className="block text-[11px] uppercase tracking-wide text-[#8FA6AE] mb-1">
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full mb-4 bg-[#1C2933] border border-[#26333F] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3D6B7D]"
              />
              <label className="block text-[11px] uppercase tracking-wide text-[#8FA6AE] mb-1">
                Full name{" "}
                <span className="normal-case text-[#5B6B73]">
                  (only needed first time)
                </span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                className="w-full mb-5 bg-[#1C2933] border border-[#26333F] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3D6B7D]"
              />
              <label className="block text-[11px] uppercase tracking-wide text-[#8FA6AE] mb-1">
                Organization code
              </label>
              <input
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                placeholder="e.g. YOURCOMPANYO1"
                className="w-full mb-5 bg-[#1C2933] border border-[#26333F] rounded-lg px-3 py-2 text-sm tracking-widest font-mono outline-none focus:border-[#3D6B7D]"
              />
              {err && (
                <p className="text-[12px] text-[#E08D6D] mb-3 flex items-center gap-1">
                  <AlertCircle size={13} />
                  {err}
                </p>
              )}
              <button
                onClick={handleSendOtp}
                disabled={busy}
                className="w-full bg-[#E0A458] hover:bg-[#EFC385] disabled:opacity-50 text-[#1A1207] font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {busy ? "Sending…" : "Send sign-in code"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("email")}
                className="flex items-center gap-1 text-[12px] text-[#8FA6AE] mb-4 hover:text-[#EDE7DA]"
              >
                <ArrowLeft size={13} /> Use a different email
              </button>
              <p className="text-[13px] text-[#8FA6AE] mb-4">
                Enter the 6-digit code sent to{" "}
                <span className="text-[#EDE7DA]">{email}</span>.
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="123456"
                className="w-full mb-5 bg-[#1C2933] border border-[#26333F] rounded-lg px-3 py-2 text-sm tracking-[0.3em] text-center font-mono outline-none focus:border-[#3D6B7D]"
                maxLength={6}
              />
              {err && (
                <p className="text-[12px] text-[#E08D6D] mb-3 flex items-center gap-1">
                  <AlertCircle size={13} />
                  {err}
                </p>
              )}
              <button
                onClick={handleVerify}
                disabled={busy}
                className="w-full bg-[#3D6B7D] hover:bg-[#4A7C8F] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {busy ? "Verifying…" : "Verify & enter"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
