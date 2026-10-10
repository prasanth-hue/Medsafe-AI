import { Check, CheckCircle2, Clock, Crown, HelpCircle, Info, Shield, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Disclaimer, ErrorBanner, Modal, Pill, Spinner } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import type { SubscriptionPlan } from "../types";

export default function Subscription() {
  const { user, setUser } = useApp();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.subscriptionPlans();
      if (res && res.plans) {
        setPlans(res.plans);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription plans.");
    } finally {
      setLoading(false);
    }
  }

  const currentPlanId = user?.plan || "trial";
  const daysLeft = user?.days_left ?? 3;

  function handleSelectPlan(plan: SubscriptionPlan) {
    if (plan.id === currentPlanId) return;
    setError(null);
    setSuccessMsg(null);

    // If selecting trial, activate directly
    if (plan.id === "trial") {
      activatePlan("trial");
      return;
    }

    // Otherwise open payment modal
    setCheckoutPlan(plan);
  }

  async function activatePlan(planId: string) {
    if (!user) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await api.subscribe(user.id, planId);
      if (res.user) {
        setUser(res.user);
        setSuccessMsg(`Successfully activated ${res.user.plan_name}!`);
      }
      setCheckoutPlan(null);
    } catch (err: any) {
      setError(err.message || "Failed to update subscription.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-tide-light px-2.5 py-0.5 text-xs font-semibold text-tide-dark">
                <Sparkles className="h-3.5 w-3.5" /> Pricing & Plans
              </span>
              <span className="text-xs font-medium text-ink-mute">Transparent Indian Rupee (INR) Pricing</span>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
              Choose the Right Plan for Your Practice
            </h1>
            <p className="mt-1 text-sm text-ink-mute max-w-2xl">
              Start risk-free with our 3-Day Free Trial. Upgrade anytime to Beginner Level (₹199/mo) or Pro Level (₹399/mo) with full Graph Neural Network reasoning.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadPlans} />}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="font-semibold">{successMsg}</div>
        </div>
      )}

      {/* Current Active Plan Status Banner */}
      {user && (
        <Card className="!p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-tide">Your Current Membership</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                  currentPlanId === "pro"
                    ? "bg-amber-400 text-amber-950"
                    : currentPlanId === "beginner"
                    ? "bg-blue-400 text-blue-950"
                    : "bg-emerald-400 text-emerald-950"
                }`}>
                  {currentPlanId === "pro" ? <Crown className="h-3 w-3" /> : currentPlanId === "beginner" ? <Zap className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {user.plan_name || (currentPlanId === "trial" ? "3-Day Free Trial" : currentPlanId.toUpperCase())}
                </span>
              </div>
              <div className="text-xl font-bold font-serif">
                {currentPlanId === "trial" && `3-Day Free Trial Active (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`}
                {currentPlanId === "beginner" && `Beginner Level Subscription (₹199 / month)`}
                {currentPlanId === "pro" && `Pro Level Clinical Subscription (₹399 / month)`}
              </div>
              <p className="text-xs text-slate-300">
                {currentPlanId === "trial"
                  ? "You have full access to test all clinical features. Upgrade to maintain uninterrupted access."
                  : `Subscription is active and valid for the current billing cycle (${daysLeft} days remaining).`}
              </p>
            </div>

            {currentPlanId !== "pro" && (
              <div className="flex-shrink-0">
                <Button
                  onClick={() => {
                    const proPlan = plans.find((p) => p.id === "pro");
                    if (proPlan) handleSelectPlan(proPlan);
                  }}
                  className="bg-white !text-ink hover:bg-slate-100 shadow-md !py-2.5 !px-5 text-sm font-semibold"
                >
                  <Crown className="h-4 w-4 text-amber-600 mr-1.5" /> Upgrade to Pro (₹399/mo)
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="py-12">
          <Spinner label="Loading subscription plans..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = currentPlanId === p.id;
            const isPopular = p.popular;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl bg-white p-6 transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-tide shadow-card-hover ring-4 ring-tide/10 md:-translate-y-1.5"
                    : "border border-line shadow-card hover:shadow-card-hover"
                }`}
              >
                {/* Popular / Recommended Pill */}
                {p.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                        isPopular
                          ? "bg-tide text-ink"
                          : "bg-slate-800 text-white"
                      }`}
                    >
                      {isPopular && <Crown className="h-3 w-3" />}
                      {p.badge}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-4">
                  <h3 className="font-serif text-xl font-bold text-ink">{p.name}</h3>
                  <p className="mt-1 text-xs text-ink-mute min-h-[36px]">{p.description}</p>
                </div>

                {/* Pricing Display */}
                <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-line/60">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-3xl font-bold text-ink">
                      {p.price_inr === 0 ? "₹0" : `₹${p.price_inr}`}
                    </span>
                    <span className="text-xs text-ink-mute font-medium">
                      {p.price_inr === 0 ? "/ 3 days" : "/ month"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-tide-dark">
                    {p.billing}
                  </div>
                </div>

                {/* Features List */}
                <div className="mb-8 flex-1 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Plan Highlights
                  </div>
                  <ul className="space-y-2.5 text-xs text-ink">
                    {p.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className={idx === 0 && isPopular ? "font-semibold text-ink" : "text-ink-soft"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action CTA Button */}
                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-xl border border-emerald-300 bg-emerald-50 py-3 text-center text-xs font-bold text-emerald-800 cursor-default"
                    >
                      ✓ Currently Active Plan
                    </button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(p)}
                      variant={isPopular ? "primary" : "secondary"}
                      className={`w-full justify-center !py-3 text-xs font-bold ${
                        isPopular ? "shadow-md hover:shadow-lg" : ""
                      }`}
                    >
                      {p.button_text}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature Comparison Table */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="font-serif text-xl font-bold text-ink mb-1">
          Plan Comparison & Capabilities
        </h2>
        <p className="text-xs text-ink-mute mb-5">
          Detailed breakdown of safety features across our Free Trial, Beginner, and Pro subscription tiers.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-ink-soft">
                <th className="p-3 font-semibold">Feature / Intelligence</th>
                <th className="p-3 text-center font-semibold">3-Day Free Trial</th>
                <th className="p-3 text-center font-semibold">Beginner (₹199/mo)</th>
                <th className="p-3 text-center font-semibold text-tide-dark">Pro (₹399/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              <tr>
                <td className="p-3 font-medium text-ink">Interaction Checker (Drug-Drug)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Unlimited (3 Days)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Unlimited</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">GCN Deep Neural Network Reasoning</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="p-3 text-center text-ink-mute">Standard KG rules</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Full 2-Layer GCN</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Prescription Label OCR Scanner</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Standard OCR</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ High-Accuracy OCR</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Patient Profiles & Schedules</td>
                <td className="p-3 text-center text-ink-soft">Up to 5 patients</td>
                <td className="p-3 text-center text-ink-soft">Up to 10 patients</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Unlimited Profiles</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Explainable AI Bio-Graph Visualizer</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Interactive</td>
                <td className="p-3 text-center text-ink-soft">Curated Profiles</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Interactive Bio-Graph</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">AI Assistant Clinical Guidance</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ 3 Days Access</td>
                <td className="p-3 text-center text-ink-mute">Basic Guidance</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Contextual Assistant</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Price & Billing Cycle</td>
                <td className="p-3 text-center font-bold text-ink">₹0 for 3 days</td>
                <td className="p-3 text-center font-bold text-ink">₹199 / month</td>
                <td className="p-3 text-center font-bold text-ink">₹399 / month</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-tide" /> Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-4 border border-line/60">
            <div className="font-bold text-ink mb-1">How does the 3-Day Free Trial work?</div>
            <p className="text-ink-mute leading-relaxed">
              Every new user gets 3 full days of access without paying anything. No credit card is required to sign up. You can explore all features before deciding to subscribe.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 border border-line/60">
            <div className="font-bold text-ink mb-1">What is the difference between Beginner and Pro?</div>
            <p className="text-ink-mute leading-relaxed">
              Beginner (₹199/mo) gives you essential pharmacology rules and up to 10 patients. Pro (₹399/mo) activates our deep 2-Layer Graph Convolutional Network (GCN) for complex polypharmacy reasoning and unlimited patients.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 border border-line/60">
            <div className="font-bold text-ink mb-1">Can I upgrade or switch plans at any time?</div>
            <p className="text-ink-mute leading-relaxed">
              Yes, you can upgrade from Beginner to Pro anytime. Your updated features activate immediately and your billing adjusts accordingly.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 border border-line/60">
            <div className="font-bold text-ink mb-1">Is patient data stored safely on my system?</div>
            <p className="text-ink-mute leading-relaxed">
              MedSafe AI is configured for local workstation privacy. Patient profiles, scans, and medication timetables are stored in your secure local database.
            </p>
          </div>
        </div>
      </div>

      {/* Clinical Disclaimer */}
      <Disclaimer />

      {/* Simulated Checkout Modal */}
      {checkoutPlan && (
        <Modal
          open={Boolean(checkoutPlan)}
          onClose={() => !isProcessing && setCheckoutPlan(null)}
          title={`Subscribe to ${checkoutPlan.name}`}
          size="md"
        >
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-4 border border-line flex items-center justify-between">
              <div>
                <div className="font-bold text-ink text-sm">{checkoutPlan.name}</div>
                <div className="text-xs text-ink-mute">{checkoutPlan.billing}</div>
              </div>
              <div className="text-right">
                <div className="font-serif text-2xl font-bold text-ink">₹{checkoutPlan.price_inr}</div>
                <div className="text-[11px] text-emerald-600 font-semibold">Taxes included</div>
              </div>
            </div>

            {/* Payment Options */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Select Payment Method (India)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    paymentMethod === "upi"
                      ? "border-tide bg-tide-light/40 font-bold text-tide-dark ring-2 ring-tide/20"
                      : "border-line bg-white hover:bg-slate-50 text-ink-soft text-xs"
                  }`}
                >
                  <div className="text-sm font-bold">UPI</div>
                  <div className="text-[10px] text-ink-mute">GPay, PhonePe, Paytm</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    paymentMethod === "card"
                      ? "border-tide bg-tide-light/40 font-bold text-tide-dark ring-2 ring-tide/20"
                      : "border-line bg-white hover:bg-slate-50 text-ink-soft text-xs"
                  }`}
                >
                  <div className="text-sm font-bold">Card</div>
                  <div className="text-[10px] text-ink-mute">Debit / Credit Card</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("netbanking")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    paymentMethod === "netbanking"
                      ? "border-tide bg-tide-light/40 font-bold text-tide-dark ring-2 ring-tide/20"
                      : "border-line bg-white hover:bg-slate-50 text-ink-soft text-xs"
                  }`}
                >
                  <div className="text-sm font-bold">Net Banking</div>
                  <div className="text-[10px] text-ink-mute">All Major Banks</div>
                </button>
              </div>
            </div>

            {/* Simulated Payment Form */}
            {paymentMethod === "upi" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink-soft" htmlFor="upi-id">
                  UPI ID (VPA)
                </label>
                <input
                  id="upi-id"
                  type="text"
                  placeholder="e.g. doctor@oksbi or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs focus:border-tide focus:outline-none"
                />
                <p className="text-[11px] text-ink-mute">
                  Instant activation with zero processing fees.
                </p>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft" htmlFor="card-num">
                    Card Number
                  </label>
                  <input
                    id="card-num"
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs focus:border-tide focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="12/28"
                      className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs focus:border-tide focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft">CVV</label>
                    <input
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs focus:border-tide focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "netbanking" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink-soft">Select Bank</label>
                <select className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs focus:border-tide focus:outline-none">
                  <option>State Bank of India (SBI)</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Kotak Mahindra Bank</option>
                  <option>Punjab National Bank</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Simulated payment test environment. Instant activation guaranteed.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                disabled={isProcessing}
                onClick={() => setCheckoutPlan(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isProcessing}
                onClick={() => activatePlan(checkoutPlan.id)}
                className="!px-6"
              >
                Confirm & Pay ₹{checkoutPlan.price_inr}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
